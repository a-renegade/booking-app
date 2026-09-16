#include "allocator.h"

#include <iostream>
#include <chrono>
#include <set>
#include <stdexcept>
#include <string>
#include <thread>
#include <cstdlib>
#include <vector>
#include <hiredis/hiredis.h>

namespace
{
void run_allocator_test()
{
    bool PRINT_BOOKINGS = true;
    constexpr int manual_booking_count = 200;
    constexpr int auto_booking_count = 200;

    const std::vector<int> subgroup_configuration{4, 3, 2};

    show_data show(
        100,
        26,
        "dummy-show",
        {'M', 50});

    std::vector<allocator_utils::seat> successfully_booked_seats;

    int manual_successful_bookings = 0;
    int manual_failed_bookings = 0;

    const auto manual_booking_start = std::chrono::steady_clock::now();

    for (int booking_number = 1;
         booking_number <= manual_booking_count;
         ++booking_number)
    {
        const auto seat = allocator_utils::random_seat(26, 100);

        const std::vector<allocator_utils::seat> seats{seat};

        const bool success = show.manual_booking(seats);

        if (!success)
        {
            ++manual_failed_bookings;

            if (PRINT_BOOKINGS)
            {
                std::cout << "Manual booking " << booking_number
                          << ": failed for "
                          << seat.first << seat.second
                          << '\n';
            }

            continue;
        }

        ++manual_successful_bookings;
        successfully_booked_seats.push_back(seat);

        if (PRINT_BOOKINGS)
        {
            std::cout << "Manual booking " << booking_number
                      << ": "
                      << seat.first << seat.second
                      << '\n';
        }
    }

    const auto manual_booking_end = std::chrono::steady_clock::now();

    const auto manual_booking_duration =
        std::chrono::duration_cast<std::chrono::microseconds>(
            manual_booking_end - manual_booking_start);

    std::cout
        << "\nManual booking test completed\n"
        << "Total bookings attempted: " << manual_booking_count << '\n'
        << "Successful bookings: " << manual_successful_bookings << '\n'
        << "Failed bookings: " << manual_failed_bookings << '\n'
        << "Time: " << manual_booking_duration.count()
        << " microseconds ("
        << manual_booking_duration.count() / 1000.0
        << " milliseconds)\n";

    std::cout << "\nSuccessfully booked random seats:\n";

    for (const auto& seat : successfully_booked_seats)
    {
        std::cout << seat.first << seat.second << ' ';
    }

    std::cout << "\n\nStarting auto booking...\n\n";

    int auto_successful_bookings = 0;
    int auto_failed_bookings = 0;

    const auto auto_booking_start = std::chrono::steady_clock::now();

    for (int booking_number = 1;
         booking_number <= auto_booking_count;
         ++booking_number)
    {
        const auto booking =
            show.auto_booking(subgroup_configuration);

        if (!booking.has_value())
        {
            ++auto_failed_bookings;

            if (PRINT_BOOKINGS)
            {
                std::cout << "Auto booking " << booking_number
                          << ": allocation failed\n";
            }

            continue;
        }

        ++auto_successful_bookings;

        if (PRINT_BOOKINGS)
        {
            std::cout << "Auto booking " << booking_number << ": ";

            bool first_seat = true;

            for (const segment_data& segment : booking.value())
            {
                std::cout << "[";

                for (int seat_number = segment.left_seat_number;
                     seat_number <= segment.right_seat_number;
                     ++seat_number)
                {
                    if (!first_seat)
                    {
                        std::cout << ", ";
                    }

                    std::cout << segment.row_char << seat_number;
                    first_seat = false;
                }

                std::cout << "] ";
            }

            std::cout << '\n';
        }
    }

    const auto auto_booking_end = std::chrono::steady_clock::now();

    const auto auto_booking_duration =
        std::chrono::duration_cast<std::chrono::microseconds>(
            auto_booking_end - auto_booking_start);

    std::cout
        << "\nAuto booking test completed\n"
        << "Total bookings attempted: " << auto_booking_count << '\n'
        << "Successful bookings: " << auto_successful_bookings << '\n'
        << "Failed bookings: " << auto_failed_bookings << '\n'
        << "Time: " << auto_booking_duration.count()
        << " microseconds ("
        << auto_booking_duration.count() / 1000.0
        << " milliseconds)\n";
}
} // namespace

int run_redis_worker()
{
    const char* redisHost = std::getenv("REDIS_HOST");
    if (redisHost == nullptr)
    {
        redisHost = "redis";
    }

    redisContext* redis = nullptr;
    while (redis == nullptr || redis->err)
    {
        if (redis != nullptr)
        {
            std::cerr << "Redis connection failed: " << redis->errstr
                      << "; retrying in 2 seconds\n";
            redisFree(redis);
        }

        redis = redisConnect(redisHost, 6379);
        if (redis == nullptr || redis->err)
        {
            if (redis != nullptr)
            {
                std::cerr << "Redis connection failed: " << redis->errstr
                          << "; retrying in 2 seconds\n";
                redisFree(redis);
                redis = nullptr;
            }
            else
            {
                std::cerr << "Redis connection failed: out of memory; retrying in 2 seconds\n";
            }
            std::this_thread::sleep_for(std::chrono::seconds(2));
        }
    }

    std::cout << "Engine connected to Redis\n";

    while (true)
    {
        redisReply* reply =
            (redisReply*)redisCommand(
                redis,
                "BRPOP allocation_queue 0"
            );

        if (reply == nullptr)
            continue;

        if (reply->type == REDIS_REPLY_ARRAY &&
            reply->elements == 2)
        {
            std::cout << "Received: "
                      << reply->element[1]->str
                      << '\n';
        }

        freeReplyObject(reply);
    }

    redisFree(redis);

    return 0;
}

int main(int argc, char* argv[])
{
    // Docker captures stdout through a pipe, where '\n' does not flush by itself.
    std::cout << std::unitbuf;

    if (argc == 2 && std::string(argv[1]) == "--allocator-test")
    {
        run_allocator_test();
        return 0;
    }

    if (argc == 1 || (argc == 2 && std::string(argv[1]) == "--redis-worker"))
    {
        return run_redis_worker();
    }

    std::cerr << "Usage: engine [--allocator-test|--redis-worker]\n";
    return 1;
}

// I need you to implement the following functionality:

// 1. Fetch ALL entries from a Redis ZSET using "ZRANGE 0 -1 WITHSCORES".
// 2. Each ZSET member is a JSON string.
// 3. Each ZSET score is a numeric value representing the distance/priority of that entry.
// 4. Parse every JSON member into a C++ type "T".
// 5. Store the result in a C++ map:
//    "std::map<std::string, T>"
//    or "std::unordered_map<std::string, T>" if that is more appropriate.
// 6. The map key should be extracted from a field inside the JSON member.
// 7. The Redis ZSET score should also be preserved in "T" as a field.
// 8. Show the complete implementation, including:
//    - required headers
//    - "T" structure
//    - "nlohmann::json" → "T" conversion
//    - Redis ZSET query
//    - fetching members with scores
//    - JSON parsing
//    - inserting into the map
//    - error handling
// 9. Do NOT use Redis Lua for this operation.
// 10. Do NOT fetch the ZSET members first and then make one Redis request per member. The ZSET should be fetched efficiently in a single operation.
// 11. Make sure the code matches the actual "redis-plus-plus" API. Do not invent function signatures.
// 12. Explain the exact type returned by the "ZRANGE WITHSCORES" operation and how member and score are accessed.
// 13. Provide a minimal runnable example that I can compile against Redis 7 Alpine.

// Assume Redis is reachable at "redis://redis:6379" when running inside Docker Compose.

// Focus on correctness and efficient data handling because this code will be used by a high-throughput seat allocation engine.
