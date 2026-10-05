import { Navigate, useLocation } from "react-router-dom";

function ProtectedRoute({ children }) {
  const location = useLocation();

  /*
  |--------------------------------------------------------------------------
  | Check MOVA authentication
  |--------------------------------------------------------------------------
  |
  | MOVA currently stores the authentication token in localStorage.
  |
  */

  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("mova_token") ||
    localStorage.getItem("accessToken");

  /*
  |--------------------------------------------------------------------------
  | User is not authenticated
  |--------------------------------------------------------------------------
  */

  if (!token) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname
        }}
      />
    );
  }

  /*
  |--------------------------------------------------------------------------
  | User is authenticated
  |--------------------------------------------------------------------------
  */

  return children;
}

export default ProtectedRoute;