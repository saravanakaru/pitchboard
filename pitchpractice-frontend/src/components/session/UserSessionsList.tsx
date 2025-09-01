import React, { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  TablePagination,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import { Visibility, BarChart, PlayArrow } from "@mui/icons-material";
// import { useAuth } from "../../hooks/useAuth";
import { useRoles } from "../../hooks/useRoles";
import { sessionAPI } from "../../services/api";
import { type Session } from "../../types";
import { getUserDisplayName } from "../../utils/userUtils";

interface UserSessionsListProps {
  onViewSession: (session: Session) => void;
  onViewAnalytics: (session: Session) => void;
  onStartNewSession?: () => void;
}

const UserSessionsList: React.FC<UserSessionsListProps> = ({
  onViewSession,
  onViewAnalytics,
  onStartNewSession,
}) => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  //   const { user } = useAuth();
  const { isAdmin, isManager } = useRoles();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      //   const params = user?.id && isTrainee() ? { userId: user?.id } : {};
      const response = await sessionAPI.getUserSessions();
      setSessions(response.data.sessions || []);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to fetch sessions");
    } finally {
      setLoading(false);
    }
  };

  const filteredSessions = sessions.filter((session) => {
    const matchesStatus =
      filterStatus === "all" || session.status === filterStatus;
    const matchesSearch =
      session.scenario.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getUserDisplayName(session)
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleChangePage = (event: unknown, newPage: number) => {
    console.log(event);
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const visibleSessions = filteredSessions.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="400px"
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3 }}>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4" component="h1">
          Coaching Sessions
        </Typography>
        {onStartNewSession && (
          <IconButton color="primary" onClick={onStartNewSession} size="large">
            <PlayArrow /> Start New Session
          </IconButton>
        )}
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Filters */}
      <Box display="flex" gap={2} mb={3}>
        <TextField
          label="Search scenarios or users"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ minWidth: 250 }}
        />
        <FormControl sx={{ minWidth: 150 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filterStatus}
            label="Status"
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="completed">Completed</MenuItem>
            <MenuItem value="in-progress">In Progress</MenuItem>
            <MenuItem value="ready">Ready</MenuItem>
            <MenuItem value="failed">Failed</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <TableContainer>
        <Table sx={{ minWidth: 650 }} aria-label="sessions table">
          <TableHead>
            <TableRow>
              {(isAdmin() || isManager()) && <TableCell>User</TableCell>}
              <TableCell>Scenario</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Score</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Created</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {visibleSessions.map((session) => (
              <TableRow key={session._id} hover>
                {(isAdmin() || isManager()) && (
                  <TableCell>{getUserDisplayName(session)}</TableCell>
                )}
                <TableCell>
                  <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                    {session.scenario}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={session.status}
                    color={
                      session.status === "completed"
                        ? "success"
                        : session.status === "in-progress"
                        ? "warning"
                        : session.status === "failed"
                        ? "error"
                        : "default"
                    }
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  {session.overallScore ? (
                    <Chip
                      label={`${session.overallScore}%`}
                      color={
                        session.overallScore >= 80
                          ? "success"
                          : session.overallScore >= 60
                          ? "warning"
                          : "error"
                      }
                      size="small"
                    />
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      N/A
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  {session.duration
                    ? `${Math.round(session.duration / 60)}m`
                    : "N/A"}
                </TableCell>
                <TableCell>
                  {new Date(session.startedAt).toLocaleDateString()}
                </TableCell>
                <TableCell align="center">
                  <IconButton
                    color="primary"
                    onClick={() => onViewSession(session)}
                    size="small"
                    title="View Details"
                  >
                    <Visibility />
                  </IconButton>
                  {session.status === "completed" && (
                    <IconButton
                      color="secondary"
                      onClick={() => onViewAnalytics(session)}
                      size="small"
                      title="View Analytics"
                    >
                      <BarChart />
                    </IconButton>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {visibleSessions.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Typography variant="body2" color="textSecondary">
                    No sessions found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25]}
        component="div"
        count={filteredSessions.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
};

export default UserSessionsList;
