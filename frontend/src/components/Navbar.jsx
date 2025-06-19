import { Link } from "react-router-dom";
import { useAuthStore } from "../store/useAuthStore";

const Navbar = () => {
  const { logout, authUser, userType } = useAuthStore();

  return (
    <header
      className="bg-base-100 border-b border-base-300 fixed w-full top-0 z-40 
    backdrop-blur-lg bg-base-100/80"
    >
      <div className="container mx-auto px-4 h-16">
        <div className="flex items-center justify-between h-full">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-80 transition-all">
              <div className="size-9 rounded-lg bg-primary/10 flex items-center justify-center">
                
              </div>
              <h1 className="text-lg font-bold">BookHere</h1>
            </Link>
          </div>

          <div className=" flex items-center gap-2">
            

            {authUser && (
              <>
                
                { ( userType === "ADMIN" || userType === "OWNER" ) && <Link to={"/add"} className={`border-1 rounded btn btn-sm gap-2 p-1`}>
                  
                  <span className="hidden sm:inline">Manage</span>
                </Link>}
                <Link to={"/profile"} className={`border-1 rounded btn btn-sm gap-2 p-1`}>
                  
                  <span className="hidden sm:inline">Profile</span>
                </Link>

                <button className="flex gap-2 items-center " onClick={logout}>
                  
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