import React, { useState } from "react";
import { Container } from "@mui/material";
import { useNavigate } from "react-router-dom";
import UserSessionsList from "./UserSessionsList";
import SessionDetails from "./SessionDetails";
import SessionAnalytics from "./SessionAnalytics";
import { type Session } from "../../types";

const SessionsPage: React.FC = () => {
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const navigate = useNavigate();

  const handleViewSession = (session: Session) => {
    setSelectedSession(session);
    setShowDetails(true);
  };

  const handleViewAnalytics = (session: Session) => {
    setSelectedSession(session);
    setShowAnalytics(true);
  };

  const handleStartNewSession = () => {
    navigate("/session/new");
  };

  const handleCloseDetails = () => {
    setShowDetails(false);
    setSelectedSession(null);
  };

  const handleCloseAnalytics = () => {
    setShowAnalytics(false);
    setSelectedSession(null);
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <UserSessionsList
        onViewSession={handleViewSession}
        onViewAnalytics={handleViewAnalytics}
        onStartNewSession={handleStartNewSession}
      />

      <SessionDetails
        session={selectedSession}
        open={showDetails}
        onClose={handleCloseDetails}
        onViewAnalytics={handleViewAnalytics}
      />

      <SessionAnalytics
        session={selectedSession}
        open={showAnalytics}
        onClose={handleCloseAnalytics}
      />
    </Container>
  );
};

export default SessionsPage;
