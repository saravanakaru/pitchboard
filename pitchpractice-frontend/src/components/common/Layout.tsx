import { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  useTheme,
  ListItemButton,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  Mic as MicIcon,
  ExitToApp as LogoutIcon,
  AccountCircle,
  VerifiedUser as UserIcon,
  BarChart as AnalyticsIcon,
} from "@mui/icons-material";
import { useAuth } from "../../hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { useRoles } from "../../hooks/useRoles";

interface LayoutProps {
  children: React.ReactNode;
}

interface MenuItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  roles: string[]; // Array of roles that can access this menu item
}

const Layout = ({ children }: LayoutProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const { hasRole } = useRoles();
  const { user, organization, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  // const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
    handleProfileMenuClose();
  };

  // Define menu items with role-based access
  const menuItems: MenuItem[] = [
    {
      text: "Dashboard",
      icon: <DashboardIcon />,
      path: "/dashboard",
      roles: ["admin", "manager", "trainee"],
    },
    {
      text: "New Session",
      icon: <MicIcon />,
      path: "/session/new",
      roles: ["trainee"],
    },
    {
      text: "My Sessions",
      icon: <MicIcon />,
      path: "/sessionsList",
      roles: ["trainee"],
    },
    {
      text: "Sessions",
      icon: <MicIcon />,
      path: "/sessionsList",
      roles: ["admin", "manager"],
    },
    {
      text: "Users",
      icon: <UserIcon />,
      path: "/users",
      roles: ["admin"], // Only admins can manage users
    },
    {
      text: "Analytics",
      icon: <AnalyticsIcon />,
      path: "/analytics",
      roles: ["admin", "manager"], // Admins and managers can view analytics
    },
    {
      text: "Organization",
      icon: <UserIcon />,
      path: "/organization",
      roles: ["admin"], // Only admins can manage organization settings
    },
  ];

  // Filter menu items based on user role
  const filteredMenuItems = menuItems.filter((item) => hasRole(item.roles));

  const drawer = (
    <Box sx={{ width: 250, pt: 2 }}>
      <Typography variant="h6" sx={{ px: 2, mb: 2, textAlign: "center" }}>
        {organization?.name}
      </Typography>
      <Typography
        variant="body2"
        sx={{
          px: 2,
          mb: 2,
          textAlign: "center",
          textTransform: "capitalize",
          color: "primary.main",
          fontWeight: "bold",
        }}
      >
        {user?.role} • {user?.firstName}
      </Typography>
      <List>
        {filteredMenuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              onClick={() => {
                navigate(item.path);
                setMobileOpen(false);
              }}
              selected={location.pathname === item.path}
              sx={{
                "&.Mui-selected": {
                  backgroundColor: theme.palette.action.selected,
                  "&:hover": {
                    backgroundColor: theme.palette.action.selected,
                  },
                },
                "&:hover": {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: "flex" }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { md: "none" } }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            PitchPractice
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Typography
              variant="body2"
              sx={{
                display: { xs: "none", sm: "block" },
                textTransform: "capitalize",
              }}
            >
              {user?.firstName} {user?.lastName} ({user?.role})
            </Typography>
            <IconButton color="inherit" onClick={handleProfileMenuOpen}>
              <AccountCircle />
            </IconButton>
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileMenuClose}
            anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
            transformOrigin={{ vertical: "top", horizontal: "right" }}
          >
            <MenuItem onClick={handleProfileMenuClose}>
              <AccountCircle sx={{ mr: 1 }} />
              Profile
            </MenuItem>
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 1 }} />
              Logout
            </MenuItem>
          </Menu>
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: 250 }, flexShrink: { md: 0 } }}>
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: 250 },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            "& .MuiDrawer-paper": {
              boxSizing: "border-box",
              width: 250,
              mt: "64px", // Adjust for AppBar height
              height: "calc(100vh - 64px)",
              border: "none",
              boxShadow: theme.shadows[3],
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - 250px)` },
          mt: "64px",
          minHeight: "calc(100vh - 64px)",
          backgroundColor: theme.palette.background.default,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default Layout;
