import { useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import { Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";

const LoginPage = () => {
  const [formData, setFormData] = useState({
      userID:"",
      password: "",
    });
  
    const { login, isLoggingIn } = useAuthStore();
  
    const validateForm = () => {
      if (!formData.userID.trim()) return toast.error("userID is required");
      if (!formData.password) return toast.error("Password is required");
      if (formData.password.length < 6) return toast.error("Password must be at least 6 characters");
  
      return true;
    };
  
    const handleSubmit = (e) => {
      e.preventDefault();
  
      const success = validateForm();
  
      if (success === true) login(formData);
    };
  return (
    <div className="min-h-screen ">
          {/* left side */}
          <div className="min-h-screen  flex flex-col justify-center items-center p-6 sm:p-12">
            <div className="bg-white shadow-xl rounded-2xl w-full max-w-md p-8">
              <div className="text-center mb-8">
                <div className="flex flex-col items-center gap-2 group">
                  <div
                    className="size-12 rounded-xl bg-primary/10 flex items-center justify-center 
                  group-hover:bg-primary/20 transition-colors"
                  >
                    
                  </div>
                  <h1 className="text-2xl font-bold mt-2">Create Account</h1>
                  <p className="text-base-content/60">Get started with your free account</p>
                </div>
              </div>
    
              <form onSubmit={handleSubmit} className="space-y-6">
    
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">userID</span>
                  </label>
                  <div className="border-1 rounded relative">
                    
                    <input
                      type="text"
                      className={`input input-bordered w-full pl-10`}
                      placeholder="abhishek_55"
                      value={formData.userID}
                      onChange={(e) => setFormData({ ...formData, userID: e.target.value })}
                    />
                  </div>
                </div>
    
                <div className="form-control">
                  <label className="label">
                    <span className="label-text font-medium">Password</span>
                  </label>
                  <div className="border-1 rounded relative">
                    
                    <input
                      type="password"
                      className={`input input-bordered w-full pl-10`}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                    
                  </div>
                </div>
    
                <button type="submit" className="flex justify-center items-center border-1 rounded w-full" disabled={isLoggingIn}>
                  {isLoggingIn ? (
                    <>
                      <Loader2 className="size-5 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    "Sign In"
                  )}
                </button>
              </form>
    
              <div className="p-10 text-center">
                <p className="text-base-content/60">
                  Don't have an account?{" "}
                  <Link to="/signup" className="underline link link-primary">
                    Create Account
                  </Link>
                </p>
              </div>
            </div>
          </div>
    
          
        </div>
  )
}

export default LoginPage