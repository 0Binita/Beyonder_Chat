import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import SentimentPieChart from "./SentimentPieChart";

const UserDetailsPage = () => {
  const { userId } = useParams();
  const [userDetails, setUserDetails] = useState(null);
  const [sentimentStats, setSentimentStats] = useState({ positive: 0, neutral: 0, negative: 0 });

  console.log("UserDetailsPage sentimentStats:", sentimentStats);

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const response = await axios.get(`/api/users/${userId}`);
        setUserDetails(response.data);
      } catch (error) {
        console.error("Error fetching user details:", error);
      }
    };

    const fetchSentimentStats = async () => {
      try {
        const response = await axios.get(`/api/users/${userId}/sentiment-stats`);
        setSentimentStats(response.data);
      } catch (error) {
        console.error("Error fetching sentiment stats:", error);
      }
    };

    fetchUserDetails();
    fetchSentimentStats();
  }, [userId]);

  if (!userDetails) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>{userDetails.name}</h2>
      <p>Email: {userDetails.email}</p>
      <div style={{ width: "100%", maxWidth: 180, margin: "0 auto", minHeight: 200 }}>
        <SentimentPieChart sentimentStats={{ positive: 40, neutral: 40, negative: 20 }} />
      </div>
    </div>
  );
};

export default UserDetailsPage;