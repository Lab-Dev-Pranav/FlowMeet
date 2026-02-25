import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const WithAuth = (WrappedComponent) => {
  const authComponent = (props) => {
    const router = useNavigate();
    const isAuthenticated = () => {
      if (localStorage.getItem("token")) {
        return true;
      }
      return false;
    };

    useEffect(() => {
      if (!isAuthenticated()) {
        router("/auth");
      }
    }, [router]);

    if (!isAuthenticated()) {
      return null;
    }

    return <WrappedComponent {...props} />;
  };
  return authComponent;
};

export default WithAuth;
