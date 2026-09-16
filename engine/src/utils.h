#pragma once

#include <cstdlib>
#include <stdexcept>
#include <tuple>
#include <utility>

#include <random>


struct segment_data
{
    char row_char;
    int left_seat_number;
    int right_seat_number;
    int distance_from_center;
    int length_of_segment;

    bool operator<(const segment_data& other) const
    {
        return std::tie(row_char,
                        left_seat_number,
                        right_seat_number,
                        distance_from_center,
                        length_of_segment) <
               std::tie(other.row_char,
                        other.left_seat_number,
                        other.right_seat_number,
                        other.distance_from_center,
                        other.length_of_segment);
    }
};

namespace allocator_utils
{
using seat = std::pair<char, int>;

inline int manhattan_distance(const seat& first_seat, const seat& second_seat)
{
    return std::abs(static_cast<int>(first_seat.first) -
                    static_cast<int>(second_seat.first)) +
           std::abs(first_seat.second - second_seat.second);
}

inline seat find_parent_seat(const seat& center_seat,
                             char segment_row,
                             int left_seat_number,
                             int right_seat_number)
{
    if (right_seat_number < center_seat.second)
    {
        return {segment_row, right_seat_number};
    }

    if (center_seat.second < left_seat_number)
    {
        return {segment_row, left_seat_number};
    }

    return {segment_row, center_seat.second};
}

inline segment_data find_best_segment(const seat& center_seat,
                                      int required_length,
                                      char row_char,
                                      int left_seat_number,
                                      int right_seat_number)
{
    const int available_length = right_seat_number - left_seat_number + 1;
    if (required_length <= 0 || required_length > available_length)
    {
        throw std::invalid_argument("required length does not fit in the segment");
    }

    int ideal_right = center_seat.second + required_length / 2;
    int ideal_left = center_seat.second - (required_length - 1) / 2;

    if (ideal_left < left_seat_number)
    {
        ideal_left = left_seat_number;
        ideal_right = left_seat_number + required_length - 1;
    }

    if (right_seat_number < ideal_right)
    {
        ideal_right = right_seat_number;
        ideal_left = right_seat_number - required_length + 1;
    }

    const seat parent_seat = find_parent_seat(
        center_seat, row_char, ideal_left, ideal_right);

    return {row_char,
            ideal_left,
            ideal_right,
            manhattan_distance(center_seat, parent_seat),
            required_length};
}

inline seat random_seat(int max_rows, int max_columns)
{
    if (max_rows <= 0 || max_columns <= 0)
    {
        throw std::invalid_argument("max rows and columns must be positive");
    }

    static thread_local std::mt19937 generator(std::random_device{}());

    std::uniform_int_distribution<int> row_distribution(0, max_rows - 1);
    std::uniform_int_distribution<int> column_distribution(1, max_columns);

    return {
        static_cast<char>('A' + row_distribution(generator)),
        column_distribution(generator)
    };
}

} // namespace allocator_utils


