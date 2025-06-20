import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";
import { useState } from "react";

const Navbar = () => {
  const { logout, authUser, userType } = useAuthStore();
  const [showManageMenu, setShowManageMenu] = useState(false);

  return (
    // <header
    //   className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 
    // backdrop-blur-lg bg-base-100/80"
    // >
    <header className="bg-base-100 border-b border-base-300">
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center"></div>
              <h1 className="text-lg font-bold">BookHere</h1>
            </Link>
          </div>

          <div className="relative flex items-center gap-2">
            {authUser && (
              <>
                {/* Home button */}
                <Link to="/" className="border-1 rounded btn btn-sm gap-2 p-1">
                  <span className="hidden sm:inline">Home</span>
                </Link>

                {/* Manage dropdown based on userType */}
                {(userType === "ADMIN" || userType === "OWNER") && (
                  <div className="relative">
                    <button
                      className="border-1 rounded btn btn-sm gap-2 p-1"
                      onClick={() => setShowManageMenu(prev => !prev)}
                    >
                      <span className="hidden sm:inline">Manage</span>
                    </button>

                    {showManageMenu && (
                      <div className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-50">
                        <Link
                          to="/manage/theaters"
                          className="block px-4 py-2 hover:bg-gray-100"
                          onClick={() => setShowManageMenu(false)}
                        >
                          Theaters
                        </Link>
                        <Link
                          to="/manage/shows"
                          className="block px-4 py-2 hover:bg-gray-100"
                          onClick={() => setShowManageMenu(false)}
                        >
                          Shows
                        </Link>
                        {userType === "ADMIN" && (
                          <Link
                            to="/manage/movies"
                            className="block px-4 py-2 hover:bg-gray-100"
                            onClick={() => setShowManageMenu(false)}
                          >
                            Movies
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <Link to="/profile" className="border-1 rounded btn btn-sm gap-2 p-1">
                  <span className="hidden sm:inline">Profile</span>
                </Link>

                <button className="flex gap-2 items-center" onClick={logout}>
                  <span className="border-1 rounded hidden sm:inline p-1">Logout</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
