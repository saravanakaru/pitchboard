import { useState } from "react";
import {
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Box,
  Alert,
  InputAdornment,
  IconButton,
  MenuItem,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  Business,
} from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";

const Register = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    organizationName: "",
    organizationType: "company",
    organizationDescription: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      await register({
        email: formData.email,
        password: formData.password,
        firstName: formData.firstName,
        lastName: formData.lastName,
        organizationName: formData.organizationName,
        organizationType: formData.organizationType,
        organizationDescription: formData.organizationDescription,
      });
      navigate("/dashboard");
    } catch (err: any) {
      setError(
        err.response?.data?.message || "Registration failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange =
    (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  return (
    <Container component="main" maxWidth="md">
      <Box
        sx={{
          marginTop: 4,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: "100%" }}>
          <Typography component="h1" variant="h4" align="center" gutterBottom>
            Create Account
          </Typography>

          <Typography
            variant="body2"
            align="center"
            color="text.secondary"
            sx={{ mb: 3 }}
          >
            Join PitchPractice and start improving your speaking skills
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {/* Name Fields */}
            <Box
              display="flex"
              gap={2}
              flexDirection={{ xs: "column", sm: "row" }}
              mb={2}
            >
              <Box flex={1}>
                <TextField
                  required
                  fullWidth
                  label="First Name"
                  value={formData.firstName}
                  onChange={handleChange("firstName")}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Person />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Box flex={1}>
                <TextField
                  required
                  fullWidth
                  label="Last Name"
                  value={formData.lastName}
                  onChange={handleChange("lastName")}
                />
              </Box>
            </Box>

            {/* Email Field */}
            <Box mb={2}>
              <TextField
                required
                fullWidth
                label="Email Address"
                type="email"
                value={formData.email}
                onChange={handleChange("email")}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>

            {/* Password Fields */}
            <Box
              display="flex"
              gap={2}
              flexDirection={{ xs: "column", sm: "row" }}
              mb={2}
            >
              <Box flex={1}>
                <TextField
                  required
                  fullWidth
                  label="Password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={handleChange("password")}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Lock />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                        >
                          {showPassword ? <VisibilityOff /> : <Visibility />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Box flex={1}>
                <TextField
                  required
                  fullWidth
                  label="Confirm Password"
                  type={showPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange("confirmPassword")}
                  error={formData.password !== formData.confirmPassword}
                  helperText={
                    formData.password !== formData.confirmPassword
                      ? "Passwords do not match"
                      : ""
                  }
                />
              </Box>
            </Box>

            {/* Organization Header */}
            <Box mb={2}>
              <Typography variant="h6" gutterBottom>
                Organization Details
              </Typography>
            </Box>

            {/* Organization Fields */}
            <Box
              display="flex"
              gap={2}
              flexDirection={{ xs: "column", sm: "row" }}
              mb={2}
            >
              <Box flex={1}>
                <TextField
                  required
                  fullWidth
                  label="Organization Name"
                  value={formData.organizationName}
                  onChange={handleChange("organizationName")}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Business />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
              <Box flex={1}>
                <TextField
                  select
                  fullWidth
                  label="Organization Type"
                  value={formData.organizationType}
                  onChange={handleChange("organizationType")}
                >
                  <MenuItem value="company">Company</MenuItem>
                  <MenuItem value="individual">Individual</MenuItem>
                </TextField>
              </Box>
            </Box>

            {/* Organization Description */}
            <Box mb={3}>
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Organization Description (Optional)"
                value={formData.organizationDescription}
                onChange={handleChange("organizationDescription")}
              />
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ py: 1.5, mb: 2 }}
              disabled={loading}
            >
              {loading ? "Creating Account..." : "Create Account"}
            </Button>

            {/* Login Link */}
            <Box textAlign="center">
              <Link to="/login" style={{ textDecoration: "none" }}>
                <Typography variant="body2" color="primary">
                  Already have an account? Sign In
                </Typography>
              </Link>
            </Box>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Register;
