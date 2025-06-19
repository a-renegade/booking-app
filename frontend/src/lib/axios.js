import axios from "axios"
export const axiosInstance = axios.create({
    baseURL:"https://booking-app-backend-9jwl.onrender.com/bookingApp/api",
    withCredentials: true,
})