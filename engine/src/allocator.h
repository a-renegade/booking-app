#pragma once

#include "utils.h"

#include <map>
#include <nlohmann/json.hpp>
#include <optional>
#include <set>
#include <stdexcept>
#include <string>
#include <utility>
#include <vector>

inline void from_json(const nlohmann::json& json, segment_data& segment)
{
    const std::string row = json.at("row_char").get<std::string>();
    if (row.size() != 1)
    {
        throw std::invalid_argument("row_char must contain exactly one character");
    }

    segment.row_char = row.front();
    json.at("left_seat_number").get_to(segment.left_seat_number);
    json.at("right_seat_number").get_to(segment.right_seat_number);
    json.at("distance_from_center").get_to(segment.distance_from_center);
    json.at("length_of_segment").get_to(segment.length_of_segment);
}

class show_data
{
private:
    enum class index_change_type
    {
        inserted,
        erased
    };

    struct index_change
    {
        index_change_type type;
        segment_data segment;
    };

public:
    static constexpr int maximum_distance_bucket_length = 7;

    // Each source entry is {score, stringified segment_data JSON}.
    using serialized_segment = std::pair<double, std::string>;
    using serialized_segments = std::vector<serialized_segment>;

    int seats_per_row;
    int total_rows;
    std::string show_id;
    std::pair<char, int> theatre_center;

    std::map<char, std::map<int, segment_data>> sorted_rights;
    std::map<int, std::set<std::pair<int, segment_data>>> sorted_distances;
    std::set<allocator_utils::seat> booked_seats;
    std::vector<std::size_t> failed_subgroup_indices;

    // Raw JSON/score data is retained until JSON-to-segment conversion is added.
    serialized_segments sorted_rights_source;
    serialized_segments sorted_distances_source;

    show_data(int seats_in_each_row,
              int number_of_rows,
              std::string id,
              std::pair<char, int> center)
        : seats_per_row(seats_in_each_row),
          total_rows(number_of_rows),
          show_id(std::move(id)),
          theatre_center(center)
    {
        const int middle_row = (1 + total_rows) / 2;

        for (int row_number = 1; row_number <= total_rows; ++row_number)
        {
            const int distance_from_center =
                row_number > middle_row ? row_number - middle_row
                                        : middle_row - row_number;

            const segment_data segment{
                static_cast<char>('A' + row_number - 1),
                1,
                seats_per_row,
                distance_from_center,
                seats_per_row};

            sorted_rights[segment.row_char].insert(
                std::make_pair(segment.right_seat_number, segment));
            sorted_distances[distance_bucket(segment.length_of_segment)].insert(
                std::make_pair(segment.distance_from_center, segment));
        }
    }

    show_data(int seats_in_each_row,
              int number_of_rows,
              std::string id,
              std::pair<char, int> center,
              serialized_segments rights_source,
              serialized_segments distances_source)
        : seats_per_row(seats_in_each_row),
          total_rows(number_of_rows),
          show_id(std::move(id)),
          theatre_center(center),
          sorted_rights_source(std::move(rights_source)),
          sorted_distances_source(std::move(distances_source))
    {
        for (const serialized_segment& source : sorted_rights_source)
        {
            const segment_data segment =
                nlohmann::json::parse(source.second).get<segment_data>();

            sorted_rights[segment.row_char].insert(
                std::make_pair(segment.right_seat_number, segment));
        }

        for (const serialized_segment& source : sorted_distances_source)
        {
            const segment_data segment =
                nlohmann::json::parse(source.second).get<segment_data>();

            sorted_distances[distance_bucket(segment.length_of_segment)].insert(
                std::make_pair(segment.distance_from_center, segment));
        }
    }

    // Returns the allocated subsegments, or std::nullopt after a full rollback.
    std::optional<std::vector<segment_data>> auto_booking(
        const std::vector<int>& subgroups)
    {
        failed_subgroup_indices.clear();

        for (std::size_t subgroup_index = 0;
             subgroup_index < subgroups.size();
             ++subgroup_index)
        {
            const int subgroup_size = subgroups[subgroup_index];
            if (subgroup_size <= 0 || subgroup_size > maximum_distance_bucket_length)
            {
                failed_subgroup_indices.push_back(subgroup_index);
                return std::nullopt;
            }
        }

        std::vector<index_change> changes;
        changes.reserve(subgroups.size() * 3);

        std::vector<segment_data> allocated_segments;
        allocated_segments.reserve(subgroups.size());

        try
        {
            for (std::size_t subgroup_index = 0;
                 subgroup_index < subgroups.size();
                 ++subgroup_index)
            {
                const int subgroup_size = subgroups[subgroup_index];
                bool segment_found = false;
                segment_data closest_segment{};
                int closest_distance = 0;

                for (auto bucket = sorted_distances.lower_bound(subgroup_size);
                     bucket != sorted_distances.end();
                     ++bucket)
                {
                    if (bucket->second.empty())
                    {
                        continue;
                    }

                    const std::pair<int, segment_data>& candidate =
                        *bucket->second.begin();

                    if (!segment_found || candidate.first < closest_distance)
                    {
                        closest_distance = candidate.first;
                        closest_segment = candidate.second;
                        segment_found = true;
                    }
                }

                if (!segment_found)
                {
                    failed_subgroup_indices.push_back(subgroup_index);
                    rollback_changes(changes);
                    return std::nullopt;
                }

                const segment_data allocated_segment = allocator_utils::find_best_segment(
                    theatre_center,
                    subgroup_size,
                    closest_segment.row_char,
                    closest_segment.left_seat_number,
                    closest_segment.right_seat_number);

                std::vector<segment_data> remaining_segments;
                remaining_segments.reserve(2);

                if (closest_segment.left_seat_number <
                    allocated_segment.left_seat_number)
                {
                    remaining_segments.push_back(make_segment(
                        closest_segment.row_char,
                        closest_segment.left_seat_number,
                        allocated_segment.left_seat_number - 1));
                }

                if (allocated_segment.right_seat_number <
                    closest_segment.right_seat_number)
                {
                    remaining_segments.push_back(make_segment(
                        closest_segment.row_char,
                        allocated_segment.right_seat_number + 1,
                        closest_segment.right_seat_number));
                }

                erase_segment(closest_segment);
                changes.push_back({index_change_type::erased, closest_segment});

                for (const segment_data& remaining_segment : remaining_segments)
                {
                    insert_segment(remaining_segment);
                    changes.push_back({index_change_type::inserted, remaining_segment});
                }

                allocated_segments.push_back(allocated_segment);
            }
        }
        catch (...)
        {
            rollback_changes(changes);
            throw;
        }

        for (const segment_data& allocated_segment : allocated_segments)
        {
            for (int seat_number = allocated_segment.left_seat_number;
                 seat_number <= allocated_segment.right_seat_number;
                 ++seat_number)
            {
                booked_seats.insert({allocated_segment.row_char, seat_number});
            }
        }

        return allocated_segments;
    }

    bool manual_booking(const std::vector<allocator_utils::seat>& seats)
    {
        std::set<allocator_utils::seat> requested_seats;

        // Validate every requested seat before changing either segment index.
        for (const allocator_utils::seat& seat : seats)
        {
            if (booked_seats.contains(seat) || !requested_seats.insert(seat).second ||
                !seat_is_available(seat))
            {
                return false;
            }
        }

        for (const allocator_utils::seat& seat : seats)
        {
            auto row = sorted_rights.find(seat.first);
            auto segment_by_right = row->second.lower_bound(seat.second);
            const segment_data old_segment = segment_by_right->second;

            erase_segment(old_segment);

            if (old_segment.left_seat_number < seat.second)
            {
                insert_segment(make_segment(old_segment.row_char,
                                            old_segment.left_seat_number,
                                            seat.second - 1));
            }

            if (seat.second < old_segment.right_seat_number)
            {
                insert_segment(make_segment(old_segment.row_char,
                                            seat.second + 1,
                                            old_segment.right_seat_number));
            }

            booked_seats.insert(seat);
        }

        return true;
    }

private:
    static int distance_bucket(int segment_length)
    {
        return segment_length > maximum_distance_bucket_length
                   ? maximum_distance_bucket_length
                   : segment_length;
    }

    static bool same_segment(const segment_data& first,
                             const segment_data& second)
    {
        return !(first < second) && !(second < first);
    }

    segment_data make_segment(char row_char,
                              int left_seat_number,
                              int right_seat_number) const
    {
        const allocator_utils::seat parent_seat = allocator_utils::find_parent_seat(
            theatre_center, row_char, left_seat_number, right_seat_number);

        return {row_char,
                left_seat_number,
                right_seat_number,
                allocator_utils::manhattan_distance(theatre_center, parent_seat),
                right_seat_number - left_seat_number + 1};
    }

    bool seat_is_available(const allocator_utils::seat& seat) const
    {
        const auto row = sorted_rights.find(seat.first);
        if (row == sorted_rights.end())
        {
            return false;
        }

        const auto segment_by_right = row->second.lower_bound(seat.second);
        return segment_by_right != row->second.end() &&
               segment_by_right->second.left_seat_number <= seat.second;
    }

    void insert_segment(const segment_data& segment)
    {
        auto& row_segments = sorted_rights[segment.row_char];
        const auto right_result = row_segments.insert(
            std::make_pair(segment.right_seat_number, segment));
        if (!right_result.second)
        {
            throw std::logic_error("duplicate segment in sorted_rights");
        }

        auto& distance_segments =
            sorted_distances[distance_bucket(segment.length_of_segment)];
        const auto distance_result = distance_segments.insert(
            std::make_pair(segment.distance_from_center, segment));
        if (!distance_result.second)
        {
            row_segments.erase(right_result.first);
            if (row_segments.empty())
            {
                sorted_rights.erase(segment.row_char);
            }
            throw std::logic_error("duplicate segment in sorted_distances");
        }
    }

    void erase_segment(const segment_data& segment)
    {
        const auto row = sorted_rights.find(segment.row_char);
        if (row == sorted_rights.end())
        {
            throw std::logic_error("segment row is missing from sorted_rights");
        }

        const auto right_segment = row->second.find(segment.right_seat_number);
        if (right_segment == row->second.end() ||
            !same_segment(right_segment->second, segment))
        {
            throw std::logic_error("segment is missing from sorted_rights");
        }

        const int bucket_key = distance_bucket(segment.length_of_segment);
        const auto bucket = sorted_distances.find(bucket_key);
        if (bucket == sorted_distances.end())
        {
            throw std::logic_error("segment bucket is missing from sorted_distances");
        }

        const auto distance_segment = bucket->second.find(
            std::make_pair(segment.distance_from_center, segment));
        if (distance_segment == bucket->second.end())
        {
            throw std::logic_error("segment is missing from sorted_distances");
        }

        row->second.erase(right_segment);
        if (row->second.empty())
        {
            sorted_rights.erase(row);
        }

        bucket->second.erase(distance_segment);
        if (bucket->second.empty())
        {
            sorted_distances.erase(bucket);
        }
    }

    void rollback_changes(const std::vector<index_change>& changes)
    {
        for (auto change = changes.rbegin(); change != changes.rend(); ++change)
        {
            if (change->type == index_change_type::inserted)
            {
                erase_segment(change->segment);
            }
            else
            {
                insert_segment(change->segment);
            }
        }
    }
};
