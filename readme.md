# BOOK HERE

A real-time movie seat booking system that addresses the challenges of group bookings, live seat selection tracking, and allocation consistency. This system supports custom group splitting, avoids seat contention through heatmap feedback, and ensures atomicity in all booking operations using Redis and Lua.

---

## Project Objective

Group bookings are often a frustrating experience in traditional ticketing systems. Once a show is partially filled, systems typically:
- Fail to keep groups seated together.
- Split people randomly across the hall.
- Provide no control over how groups are divided.

This project solves that by:
- Allowing users to define multiple valid group split formats (e.g., [3,4], [2,2,3]).
- Trying each format in order, placing subgroups close to the screen center.
- Using Manhattan distance to preserve proximity and group cohesion.

---

## Key Features

| Feature | Status |
|--------|--------|
| Movie listings and showtimes | Implemented |
| Seat layout and manual selection | Implemented |
| Subgroup-based allocation using Manhattan distance | Implemented |
| User-defined subgroup split formats with priorities | Implemented |
| Real-time seat selection tracking via Redis | Implemented |
| Seat popularity heatmap based on live selection count | Implemented |
| Atomic booking logic using Redis Lua script | Implemented |
| Role-based access (Admin, Owner, User) | Implemented |
| Collaborative group seat selection | Planned |
| Payment and ticketing system | Planned |

---

## Seat Selection Logic

1. User enters total group size (e.g., 7).
2. User submits subgroup sets such as [3,4] or [2,2,3].
3. System tries each set in order.
4. Allocator searches seat layout starting from the center using Manhattan distance.
5. Seats are previewed in the UI, colored by current popularity.
6. The first format that fits is booked atomically.

---

## Seat Popularity Feedback

- Each time a user selects a seat, Redis updates the number of current selectors.
- A popularity heatmap is generated for every show.
- This heatmap helps users avoid highly contested seats and improves the chances of booking success.

---

## Atomic Booking System

- All seat locks and booking attempts are handled through a Lua script on Redis.
- Manual and auto allocation follow the same booking pathway.
- Bookings are atomic: either all seats in the group are booked or none.
- No partial group bookings or inconsistent seat states.

---

## Tech Stack

**Frontend:**
- React (Vite)
- Zustand
- Axios
- Socket.IO Client

**Backend:**
- Node.js + Express
- MongoDB (Mongoose)
- Redis (for cache and coordination)
- Lua scripting (for atomic logic)

**Seat Data Formats:**
- Frontend: `{ row: "A", col: 1 }`
- Backend / Redis: `"A-1"`

---

## API Endpoints (High-Level)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/movie` | Get all movies |
| GET | `/api/show/:movieId` | Get showtimes for a movie |
| GET | `/api/seat/:showId` | Get seat layout with popularity data |
| POST | `/api/booking` | Submit seat selection and allocation strategy |
| POST | `/api/booking/auto` | Execute subgroup allocation |

---

## Architecture

                        +---------------------+
                        |    React Frontend   |
                        |  (Vite + Zustand)   |
                        +---------------------+
                                 |
     REST API (Axios)            |              WebSockets (Socket.IO)
           +---------------------v---------------------+
           |           Node.js + Express API           |
           |          (Seat logic & auth)              |
           +---------------------+---------------------+
                                 |
                +----------------+----------------+
                |                                 |
    +-----------v------------+        +-----------v-----------+
    |     MongoDB (Mongoose) |        |    Redis (Cache +     |
    |  Movies, Shows, Users  |        | Seat selection count, |
    |  Booking Records       |        | Heatmap, Lua Scripts) |
    +------------------------+        +------------------------+
