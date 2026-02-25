import React, { useContext, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import { authContext } from "../contexts/AuthContexts.jsx";
import WithAuth from "../utils/withAuth.jsx";

function History() {
  const navigate = useNavigate();
  const { getUserHistory } = useContext(authContext);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadHistory = async () => {
    setLoading(true);
    setError("");

    const data = await getUserHistory();
    if (!Array.isArray(data)) {
      setHistory([]);
      setError("Failed to load meeting history.");
      setLoading(false);
      return;
    }

    setHistory(data);
    setLoading(false);
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const sortedHistory = useMemo(() => {
    return [...history].sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [history]);

  const formatDate = (value) => {
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return "Unknown date";
    }
    return parsedDate.toLocaleString();
  };

  const handleJoinMeeting = (meetingCode) => {
    if (!meetingCode) return;
    navigate(`/${meetingCode}`);
  };

  if (loading) {
    return (
      <Box sx={{ minHeight: "60vh", display: "grid", placeItems: "center" }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography variant="body1">Loading meeting history...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ px: { xs: 2, md: 5 }, py: 4, maxWidth: "1000px", mx: "auto" }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Meeting History
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" onClick={loadHistory}>
            Refresh
          </Button>
          <Button variant="contained" onClick={() => navigate("/home")}>
            New Meeting
          </Button>
        </Stack>
      </Stack>

      {error ? (
        <Paper elevation={1} sx={{ p: 3, textAlign: "center", borderRadius: 2 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      ) : null}

      {!error && sortedHistory.length === 0 ? (
        <Paper elevation={1} sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            No meetings yet
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Start a meeting from Home, and it will appear here.
          </Typography>
        </Paper>
      ) : null}

      {!error && sortedHistory.length > 0 ? (
        <Stack spacing={2}>
          {sortedHistory.map((meeting, index) => {
            const code = meeting.meeting_code || meeting.mettingCode || meeting.mettingcode || "";
            const itemKey = meeting._id || `${code}-${index}`;

            return (
              <Paper key={itemKey} elevation={1} sx={{ p: 2.5, borderRadius: 2 }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Meeting Code
                    </Typography>
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>
                      {code || "Unavailable"}
                    </Typography>
                    <Divider sx={{ my: 1.2 }} />
                    <Typography variant="body2" color="text.secondary">
                      Created on {formatDate(meeting.date)}
                    </Typography>
                  </Box>

                  <Stack justifyContent="center">
                    <Button
                      variant="contained"
                      disabled={!code}
                      onClick={() => handleJoinMeeting(code)}
                    >
                      Join Again
                    </Button>
                  </Stack>
                </Stack>
              </Paper>
            );
          })}
        </Stack>
      ) : null}
    </Box>
  );
}

export default WithAuth(History);
