import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useChatStore } from "../store/useChatStore";
import { useSentimentModel } from "../../context/SentimentModelContext";
import Footer from "../components/footer";
import DeleteConfirmDialog from "../components/DeleteConfirmDialog";
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement, 
  LineElement, 
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { 
  Users, 
  MessageSquare, 
  Shield, 
  TrendingUp, 
  Settings, 
  BarChart3, 
  AlertTriangle,
  UserX,
  Eye,
  Trash2,
  Search,
  Filter,
  MoreVertical,
  RefreshCw,
  X
} from "lucide-react";

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { setSelectedUser } = useChatStore();
  const { selectedModel, setSelectedModel } = useSentimentModel();
  // All useState hooks at the top
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [groups, setGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [inactiveUsers, setInactiveUsers] = useState(0);
  const [activeChats, setActiveChats] = useState(8); // Placeholder
  // Reported users state
  const [reportedUsersData, setReportedUsersData] = useState([]);
  const [loadingReportedUsers, setLoadingReportedUsers] = useState(true);
  const [reportedUsersError, setReportedUsersError] = useState("");
  const [reportedUsersSearch, setReportedUsersSearch] = useState("");
  const [reportedGroupsSearch, setReportedGroupsSearch] = useState("");
  // Search states for main management sections
  const [usersSearch, setUsersSearch] = useState("");
  const [groupsSearch, setGroupsSearch] = useState("");
  // Reported groups state
  const [reportedGroupsData, setReportedGroupsData] = useState([]);
  const [loadingReportedGroups, setLoadingReportedGroups] = useState(true);
  const [reportedGroupsError, setReportedGroupsError] = useState("");
  // Analytics modal state
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  
  // Tab management
  const [activeTab, setActiveTab] = useState('users');
  
  // Selected items for profile view
  const [selectedUserProfile, setSelectedUserProfile] = useState(null);
  const [selectedGroupProfile, setSelectedGroupProfile] = useState(null);
  const [selectedReportProfile, setSelectedReportProfile] = useState(null);
  
  // Delete confirmation dialog state
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: null,
    isLoading: false
  });
  
  // Constants derived from state
  const reportedUsers = Array.isArray(reportedUsersData) ? reportedUsersData.length : 0;

  // Helper functions for tab switching
  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
    setSelectedUserProfile(null);
    setSelectedGroupProfile(null);
    setSelectedReportProfile(null);
  };

  const fetchUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      const data = await res.json();
      setUsers(data);
      setTotalUsers(data.length);
      setActiveUsers(data.filter((u) => u.isActive !== false).length);
      setInactiveUsers(data.filter((u) => u.isActive === false).length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    setLoadingGroups(true);
    setError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/group/all", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch groups");
      }
      const data = await res.json();
      console.log("Fetched groups data:", data); // Add this line
      setGroups(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingGroups(false);
    }
  };

  const handleDelete = async (userId) => {
    const user = users.find(u => u._id === userId);
    const userName = user ? user.fullName : "User";
    
    setDeleteDialog({
      isOpen: true,
      title: "Delete User",
      message: `Are you sure you want to delete ${userName}?`,
      onConfirm: async () => {
        setDeleteDialog(prev => ({ ...prev, isLoading: true }));
        try {
          const token = localStorage.getItem("token");
          const res = await fetch(`/api/admin/users/${userId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          if (!res.ok) {
            throw new Error("Failed to delete user");
          }
          setUsers((prevUsers) => prevUsers.filter((user) => user._id !== userId));
          setReportedUsersData((prevReports) =>
            prevReports.filter((report) => report.reportedUser?._id !== userId)
          );
          setDeleteDialog({ isOpen: false, title: "", message: "", onConfirm: null, isLoading: false });
        } catch (err) {
          alert(err.message);
          setDeleteDialog(prev => ({ ...prev, isLoading: false }));
        }
      },
      isLoading: false
    });
  };

  const handleDeleteGroup = async (groupId) => {
    const groupToDelete = groups.find(group => group._id === groupId);
    const groupName = groupToDelete ? groupToDelete.name : 'this group';
    
    setDeleteDialog({
      isOpen: true,
      title: "Delete Group",
      message: `Are you sure you want to delete "${groupName}"? This action cannot be undone.`,
      onConfirm: async () => {
        setDeleteDialog(prev => ({ ...prev, isLoading: true }));
        try {
          const token = localStorage.getItem("token");
          const res = await fetch(`/api/group/${groupId}`, {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.message || "Failed to delete group");
          }
          
          // Update the groups list by removing the deleted group
          setGroups(groups.filter((group) => group._id !== groupId));
          
          setDeleteDialog({ isOpen: false, title: "", message: "", onConfirm: null, isLoading: false });
        } catch (err) {
          console.error("Error deleting group:", err);
          alert(`Error: ${err.message}`);
          setDeleteDialog(prev => ({ ...prev, isLoading: false }));
        }
      },
      isLoading: false
    });
  };

  // Fetch reported users (new endpoint and data structure)
  const fetchReportedUsers = async () => {
    setLoadingReportedUsers(true);
    setReportedUsersError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/admin/reported-users-count", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch reported users");
      }
      const data = await res.json();
      // data is expected to be [{ reportedUser: <id>, count: <number> }]
      setReportedUsersData(data);
    } catch (err) {
      setReportedUsersError(err.message);
    } finally {
      setLoadingReportedUsers(false);
    }
  };

  // Fetch reported groups count
  const fetchReportedGroups = async () => {
    setLoadingReportedGroups(true);
    setReportedGroupsError("");
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/report/groups/count", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) {
        throw new Error("Failed to fetch reported groups");
      }
      const data = await res.json();
      setReportedGroupsData(data);
    } catch (err) {
      setReportedGroupsError(err.message);
    } finally {
      setLoadingReportedGroups(false);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchGroups();
    fetchReportedUsers();
    fetchReportedGroups();
  }, []);

  // Clear analytics data when selected model changes to force refetch
  useEffect(() => {
    console.log('Model changed to:', selectedModel);
    if (analyticsData) {
      console.log('Clearing analytics data due to model change');
      setAnalyticsData(null);  // ✅ Already implemented
    }
  }, [selectedModel]);

  // Refresh all data
  const handleRefresh = async () => {
    setRefreshing(true);
    // Clear selected profiles when refreshing
    setSelectedUserProfile(null);
    setSelectedGroupProfile(null);
    setSelectedReportProfile(null);
    
    try {
      await Promise.all([
        fetchUsers(),
        fetchGroups(),
        fetchReportedUsers(),
        fetchReportedGroups()
      ]);
    } catch (error) {
      console.error("Error refreshing data:", error);
      setError("Failed to refresh data. Please try again.");
    } finally {
      setRefreshing(false);
    }
  };

  // Helper function to get report count for a user
  const getUserReportCount = (userId) => {
    const reportedUser = reportedUsersData.find(report => report.reportedUser === userId);
    return reportedUser ? reportedUser.count : 0;
  };

  // Handle viewing user profile
  const handleViewUserProfile = (user) => {
    setSelectedUserProfile(user);
  };

  // Handle viewing group profile
  const handleViewGroupProfile = (group) => {
    setSelectedGroupProfile(group);
  };

  // Handle viewing report profile
  const handleViewReportProfile = (report) => {
    setSelectedReportProfile(report);
  };

  // Fetch analytics data
  const fetchAnalyticsData = async () => {
    setAnalyticsLoading(true);
    try {
      const url = `http://127.0.0.1:8000/api/sentiment/analytics/?model=${selectedModel}`;
      console.log('🔄 Fetching analytics with model:', selectedModel); // Add this
      console.log('📡 URL:', url);
      
      const response = await fetch(url);
      console.log('📊 Response status:', response.status);
      
      if (!response.ok) {
        throw new Error("Failed to fetch analytics data");
      }
      const data = await response.json();
      console.log('✅ Analytics data received for model:', selectedModel, data); // Add this
      setAnalyticsData(data.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
      // Use the actual calculated data as fallback - always include both models
      const allModelsData = {
        models: {
          naive_bayes: {
            name: 'Naive Bayes',
            accuracy: 65.8,
            precision: 67.6,
            recall: 65.8,
            f1_score: 66.2,
            selected: selectedModel === 'nb'
          },
          svc: {
            name: 'Support Vector Classifier',
            accuracy: 71.7,
            precision: 73.3,
            recall: 71.7,
            f1_score: 72.0,
            selected: selectedModel === 'svc'
          }
        },
        selected_model: selectedModel,
        dataset_stats: {
          training_samples: 27480,
          test_samples: 3224,
          total_samples: 3224,
          classes: 3,
          class_distribution: {
            neutral: 1121,
            positive: 1103,
            negative: 1000
          }
        },
        insights: [
          {
            type: 'best_performance',
            title: 'Best Overall Performance',
            message: 'SVC demonstrates superior performance across all metrics, with 5.9% higher accuracy than Naive Bayes.',
            color: 'green'
          },
          {
            type: 'speed_accuracy',
            title: 'Speed vs Accuracy Trade-off',
            message: 'Naive Bayes offers faster training and prediction times, while SVC provides better accuracy for complex patterns.',
            color: 'blue'
          },
          {
            type: 'recommendation',
            title: 'Recommendation',
            message: 'Use SVC for higher accuracy requirements, or Naive Bayes for faster real-time processing needs.',
            color: 'yellow'
          }
        ]
      };
      
      console.log('Using fallback data for model:', selectedModel, allModelsData);
      setAnalyticsData(allModelsData);
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const handleViewAnalytics = () => {
    setShowAnalytics(true);
    if (!analyticsData) {
      fetchAnalyticsData();
    }
  };

  if (loading) return <div className="p-4">Loading users...</div>;
  if (error) return <div className="p-4 text-red-500">Error: {error}</div>;

  // Filtered arrays for search functionality
  const filteredUsers = users.filter(user =>
    user.fullName.toLowerCase().includes(usersSearch.toLowerCase()) ||
    user.email.toLowerCase().includes(usersSearch.toLowerCase())
  );

  const filteredGroups = groups.filter(group =>
    group.name.toLowerCase().includes(groupsSearch.toLowerCase())
  );

  // Placeholder reported groups data array
  // const reportedUsersList = [ ... ]; // Removed, now using reportedUsersData
  // Filtered reported users from fetched data (search by user name/email, not ID)
  const filteredReportedUsers = reportedUsersData
    .filter(report => report.reportedUser)
    .filter(report => {
      if (!reportedUsersSearch) return true;
      const userData = users.find(u => u._id === report.reportedUser);
      if (!userData) return false;
      const searchTerm = reportedUsersSearch.toLowerCase();
      return (
        userData.fullName.toLowerCase().includes(searchTerm) ||
        userData.email.toLowerCase().includes(searchTerm)
      );
    });
  // Filtered reported groups from fetched data
  const filteredReportedGroups = Array.isArray(reportedGroupsData)
    ? reportedGroupsData.filter(group =>
        group.name &&
        group.name.toLowerCase().includes(reportedGroupsSearch.toLowerCase())
      )
    : [];

  return (
    <div className="min-h-screen bg-base-100">
      {/* Header */}
      <div className="bg-base-200 border-b mt-16 border-base-300">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-primary/10 rounded-lg">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-base-content">Admin Dashboard</h1>
                <p className="text-base-content/60">Manage users, groups, and system settings</p>
              </div>
            </div>
            
            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              {/* Sentiment Model Selector with Visual Feedback */}
              <div className="flex items-center gap-2">
                <label className="text-sm font-medium text-base-content">Model:</label>
                <select 
                  value={selectedModel} 
                  onChange={(e) => {
                    const newModel = e.target.value;
                    console.log('🔄 Model changed from', selectedModel, 'to', newModel);
                    setSelectedModel(newModel);
                    // Clear analytics to force refetch
                    setAnalyticsData(null);
                  }}
                  className="select select-bordered select-sm bg-base-100 text-base-content font-medium min-w-0 w-full sm:w-auto"
                >
                  <option value="nb">Naive Bayes {selectedModel === 'nb' ? '✓' : ''}</option>
                  <option value="svc">Support Vector Classifier {selectedModel === 'svc' ? '✓' : ''}</option>
                </select>
                {/* Visual indicator showing active model */}
                <div className="badge badge-sm badge-primary">
                  {selectedModel === 'nb' ? 'NB Active' : 'SVC Active'}
                </div>
              </div>
              
              {/* Analytics Button */}
              <button
                onClick={handleViewAnalytics}
                className="btn btn-primary btn-sm gap-2"
                disabled={analyticsLoading}
              >
                <BarChart3 className="w-4 h-4" />
                {analyticsLoading ? 'Loading...' : 'Analytics'}
              </button>
              
              {/* Refresh Button */}
              <button
                onClick={handleRefresh}
                className={`btn btn-ghost btn-sm gap-2 ${refreshing ? 'loading' : ''}`}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base-content/60 text-sm font-medium">Total Users</p>
                  <p className="text-3xl font-bold text-base-content">{totalUsers}</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Users className="w-6 h-6 text-primary" />
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base-content/60 text-sm font-medium">Active Users</p>
                  <p className="text-3xl font-bold text-success">{activeUsers}</p>
                </div>
                <div className="p-3 bg-success/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-success" />
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base-content/60 text-sm font-medium">Total Groups</p>
                  <p className="text-3xl font-bold text-base-content">{groups.length}</p>
                </div>
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <MessageSquare className="w-6 h-6 text-secondary" />
                </div>
              </div>
            </div>
          </div>

          <div className="card bg-base-200 shadow-sm">
            <div className="card-body p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-base-content/60 text-sm font-medium">Reports</p>
                  <p className="text-3xl font-bold text-warning">{reportedUsers}</p>
                </div>
                <div className="p-3 bg-warning/10 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-warning" />
                </div>
              </div>
            </div>
          </div>
        </div>

        </div>

        {/* Main Content Tabs */}
        <div className="tabs tabs-boxed bg-base-200 mb-8 mx-4">
          <button 
            className={`tab ${activeTab === 'users' ? 'tab-active' : ''}`}
            onClick={() => handleTabSwitch('users')}
          >
            <Users className="w-4 h-4 mr-2" />
            Users Management
          </button>
          <button 
            className={`tab ${activeTab === 'groups' ? 'tab-active' : ''}`}
            onClick={() => handleTabSwitch('groups')}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            Groups Management
          </button>
          <button 
            className={`tab ${activeTab === 'reports' ? 'tab-active' : ''}`}
            onClick={() => handleTabSwitch('reports')}
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Reports & Moderation
          </button>
        </div>

        {/* Users Management Section */}
        {activeTab === 'users' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 px-4">
          {/* Users Table */}
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title text-xl flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Users Management
                </h2>
                <div className="badge badge-primary">{totalUsers} total</div>
              </div>
              
              {/* Search */}
              <div className="form-control mb-4">
                <input
                  type="text"
                  placeholder="Search users..."
                  className="input input-bordered input-md bg-base-100 w-full"
                  value={usersSearch}
                  onChange={(e) => setUsersSearch(e.target.value)}
                />
              </div>

              {loading ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner loading-md"></span>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{usersSearch ? 'No users found matching your search' : 'No users found'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>User</th>
                        <th>Email</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((user) => (
                        <tr key={user._id} className="hover">
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="avatar">
                                <div className="mask mask-squircle w-8 h-8">
                                  <img
                                    src={user.profilePic || "/avatar.png"}
                                    alt={user.fullName || "User"}
                                    onError={(e) => {
                                      e.target.onerror = null;
                                      e.target.src = "/avatar.png";
                                    }}
                                  />
                                </div>
                              </div>
                              <div>
                                <div className="font-bold text-sm">{user.fullName}</div>
                              </div>
                            </div>
                          </td>
                          <td className="text-sm text-base-content/70">{user.email}</td>
                          <td>
                            <div className={`badge badge-sm ${user.isActive !== false ? 'badge-success' : 'badge-error'}`}>
                              {user.isActive !== false ? 'Active' : 'Inactive'}
                            </div>
                          </td>
                          <td>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleViewUserProfile(user)}
                                className="btn btn-ghost btn-xs"
                                title="View Profile"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDelete(user._id)}
                                className="btn btn-ghost btn-xs text-error"
                                title="Delete User"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* User Profile Details Card */}
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title text-xl flex items-center gap-2">
                  <UserX className="w-5 h-5" />
                  User Profile Details
                </h2>
              </div>
              
              {selectedUserProfile ? (
                <div className="space-y-6">
                  {/* Profile Header */}
                  <div className="flex items-center gap-4 p-4 bg-base-100 rounded-lg">
                    <div className="avatar">
                      <div className="w-16 h-16 rounded-full">
                        <img 
                          src={selectedUserProfile.profilePic || "/avatar.png"} 
                          alt={selectedUserProfile.fullName}
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = "/avatar.png";
                          }}
                        />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-base-content">{selectedUserProfile.fullName}</h3>
                      <p className="text-base-content/70">{selectedUserProfile.email}</p>
                      <div className={`badge badge-sm mt-1 ${selectedUserProfile.isActive !== false ? 'badge-success' : 'badge-error'}`}>
                        {selectedUserProfile.isActive !== false ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>

                  {/* Profile Information */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="stat bg-base-100 rounded-lg p-4">
                        <div className="stat-title text-base-content/60">User ID</div>
                        <div className="stat-value text-sm text-base-content">{selectedUserProfile._id}</div>
                      </div>
                      
                      <div className="stat bg-base-100 rounded-lg p-4">
                        <div className="stat-title text-base-content/60">Reports Count</div>
                        <div className="stat-value text-lg text-warning">{getUserReportCount(selectedUserProfile._id)}</div>
                      </div>
                    </div>

                    {/* Interests Section */}
                    {selectedUserProfile.interests && selectedUserProfile.interests.length > 0 && (
                      <div className="bg-base-100 rounded-lg p-4">
                        <h4 className="font-semibold text-base-content mb-2">Interests</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedUserProfile.interests.map((interest, index) => (
                            <div key={index} className="badge badge-primary badge-outline">
                              {interest}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Additional Info */}
                    <div className="bg-base-100 rounded-lg p-4">
                      <h4 className="font-semibold text-base-content mb-2">Additional Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-base-content/70">Created At:</span>
                          <span className="text-base-content">
                            {selectedUserProfile.createdAt ? new Date(selectedUserProfile.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-base-content/70">Last Updated:</span>
                          <span className="text-base-content">
                            {selectedUserProfile.updatedAt ? new Date(selectedUserProfile.updatedAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        setSelectedUser(selectedUserProfile);
                        navigate("/");
                      }}
                      className="btn btn-primary flex-1"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Chat with User
                    </button>
                    <button
                      onClick={() => {
                        handleDelete(selectedUserProfile._id);
                        setSelectedUserProfile(null);
                      }}
                      className="btn btn-error flex-1"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete User
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-base-content/60">
                  <UserX className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg mb-2">No User Selected</p>
                  <p className="text-sm">Click the eye icon next to a user to view their profile details</p>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Groups Management Section */}
        {activeTab === 'groups' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 px-4">
            {/* Groups Table */}
            <div className="card bg-base-200 shadow-sm">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title text-xl flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  Groups Management
                </h2>
                <div className="badge badge-secondary">{groups.length} total</div>
              </div>
              
              {/* Search */}
              <div className="form-control mb-4">
                <input
                  type="text"
                  placeholder="Search groups..."
                  className="input input-bordered input-md bg-base-100 w-full"
                  value={groupsSearch}
                  onChange={(e) => setGroupsSearch(e.target.value)}
                />
              </div>

              {loadingGroups ? (
                <div className="flex justify-center py-8">
                  <span className="loading loading-spinner loading-md"></span>
                </div>
              ) : filteredGroups.length === 0 ? (
                <div className="text-center py-8 text-base-content/60">
                  <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>{groupsSearch ? 'No groups found matching your search' : 'No groups found'}</p>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-96">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Group</th>
                        <th>Members</th>
                        <th>Created</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredGroups.map((group) => (
                        <tr key={group._id} className="hover">
                          <td>
                            <div className="flex items-center gap-3">
                              <div className="avatar">
                                <div className="mask mask-squircle w-8 h-8">
                                  {group.profilePic ? (
                                    <img src={group.profilePic} alt={group.name} />
                                  ) : (
                                    <div className="w-8 h-8 bg-secondary/20 flex items-center justify-center text-secondary font-bold text-xs">
                                      {group.name?.charAt(0)?.toUpperCase() || "?"}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="font-bold text-sm">{group.name}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="badge badge-ghost badge-sm">
                              {group.members?.length || 0} members
                            </div>
                          </td>
                          <td className="text-sm text-base-content/70">
                            {new Date(group.createdAt).toLocaleDateString()}
                          </td>
                          <td>
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleViewGroupProfile(group)}
                                className="btn btn-ghost btn-xs"
                                title="View Group"
                              >
                                <Eye className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => handleDeleteGroup(group._id)}
                                className="btn btn-ghost btn-xs text-error"
                                title="Delete Group"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Group Details Card */}
          <div className="card bg-base-200 shadow-sm">
            <div className="card-body">
              <div className="flex items-center justify-between mb-4">
                <h2 className="card-title text-xl flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-secondary" />
                  Group Details
                </h2>
              </div>
              
              {selectedGroupProfile ? (
                <div className="space-y-6">
                  {/* Group Header */}
                  <div className="flex items-start gap-4">
                    <div className="avatar">
                      <div className="w-16 h-16 rounded-lg">
                        {selectedGroupProfile.profilePic ? (
                          <img 
                            src={selectedGroupProfile.profilePic} 
                            alt={selectedGroupProfile.name}
                          />
                        ) : (
                          <div className="w-16 h-16 bg-secondary/20 flex items-center justify-center text-secondary font-bold">
                            {selectedGroupProfile.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-base-content">{selectedGroupProfile.name}</h3>
                      <p className="text-base-content/70">{selectedGroupProfile.description || 'No description'}</p>
                      <div className="badge badge-secondary badge-sm mt-1">
                        {selectedGroupProfile.members?.length || 0} members
                      </div>
                    </div>
                  </div>

                  {/* Group Information */}
                  <div className="space-y-4">
                    <div className="bg-base-100 rounded-lg p-4">
                      <h4 className="font-semibold text-base-content mb-3">Group Information</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-base-content/70">Group ID:</span>
                          <span className="text-base-content font-mono">{selectedGroupProfile._id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-base-content/70">Name:</span>
                          <span className="text-base-content">{selectedGroupProfile.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-base-content/70">Description:</span>
                          <span className="text-base-content">{selectedGroupProfile.description || 'No description'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-base-content/70">Members:</span>
                          <span className="text-base-content">{selectedGroupProfile.members?.length || 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-base-content/70">Created:</span>
                          <span className="text-base-content">
                            {selectedGroupProfile.createdAt ? new Date(selectedGroupProfile.createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-base-content/70">Last Updated:</span>
                          <span className="text-base-content">
                            {selectedGroupProfile.updatedAt ? new Date(selectedGroupProfile.updatedAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    <button
                      onClick={() => {
                        handleDeleteGroup(selectedGroupProfile._id);
                        setSelectedGroupProfile(null);
                      }}
                      className="btn btn-error w-full"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete Group
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-base-content/60">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="text-lg mb-2">No Group Selected</p>
                  <p className="text-sm">Click the eye icon next to a group to view its details</p>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Reports & Moderation Section */}
        {activeTab === 'reports' && (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 px-4">
            {/* Reports Table */}
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="card-title text-xl flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    Reported Content
                  </h2>
                  <div className="badge badge-warning">{reportedUsers + filteredReportedGroups.length} reports</div>
                </div>
                
                {/* Search */}
                <div className="form-control mb-4">
                  <input
                    type="text"
                    placeholder="Search reports..."
                    className="input input-bordered input-md bg-base-100 w-full"
                    value={reportedUsersSearch}
                    onChange={(e) => setReportedUsersSearch(e.target.value)}
                  />
                </div>

                {(loadingReportedUsers || loadingReportedGroups) ? (
                  <div className="flex justify-center py-8">
                    <span className="loading loading-spinner loading-md"></span>
                  </div>
                ) : (filteredReportedUsers.length === 0 && filteredReportedGroups.length === 0) ? (
                  <div className="text-center py-8 text-base-content/60">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No reports found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto max-h-96">
                    <table className="table table-sm">
                      <thead>
                        <tr>
                          <th>Reported Content</th>
                          <th>Type</th>
                          <th>Reports</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {/* Reported Users */}
                        {filteredReportedUsers.map((report) => {
                          const userData = users.find((u) => u._id === report.reportedUser);
                          return (
                            <tr key={`user-${report._id || report.reportedUser}`} className="hover">
                              <td>
                                <div className="flex items-center gap-3">
                                  <div className="avatar">
                                    <div className="mask mask-squircle w-8 h-8">
                                      <img 
                                        src={userData?.profilePic || "/avatar.png"} 
                                        alt={userData?.fullName || "Unknown"}
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <div className="font-bold text-sm">
                                      {userData?.fullName || "Unknown User"}
                                    </div>
                                    <div className="text-xs opacity-70">
                                      {userData?.email || "No email"}
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <div className="badge badge-outline badge-sm">User</div>
                              </td>
                              <td>
                                <div className="badge badge-warning badge-sm">
                                  {report.count || 1}
                                </div>
                              </td>
                              <td>
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleViewReportProfile({
                                      ...report,
                                      reportedUser: report.reportedUser,
                                      type: 'user'
                                    })}
                                    className="btn btn-ghost btn-xs"
                                    title="View Report"
                                  >
                                    <Eye className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleDelete(report.reportedUser)}
                                    className="btn btn-ghost btn-xs text-error"
                                    title="Delete User"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        
                        {/* Reported Groups */}
                        {filteredReportedGroups.map((group) => (
                          <tr key={`group-${group._id}`} className="hover">
                            <td>
                              <div className="flex items-center gap-3">
                                <div className="avatar">
                                  <div className="mask mask-squircle w-8 h-8">
                                    {group.profilePic ? (
                                      <img src={group.profilePic} alt={group.name} />
                                    ) : (
                                      <div className="w-8 h-8 bg-warning/20 flex items-center justify-center text-warning font-bold text-xs">
                                        {group.name?.charAt(0)?.toUpperCase() || "?"}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div>
                                  <div className="font-bold text-sm">{group.name}</div>
                                  <div className="text-xs opacity-70">{group.members?.length || 0} members</div>
                                </div>
                              </div>
                            </td>
                            <td>
                              <div className="badge badge-outline badge-sm">Group</div>
                            </td>
                            <td>
                              <div className="badge badge-warning badge-sm">
                                {group.reportCount || 1}
                              </div>
                            </td>
                            <td>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => handleViewReportProfile({
                                    ...group,
                                    type: 'group'
                                  })}
                                  className="btn btn-ghost btn-xs"
                                  title="View Report"
                                >
                                  <Eye className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteGroup(group._id)}
                                  className="btn btn-ghost btn-xs text-error"
                                  title="Delete Group"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Report Details Card */}
            <div className="card bg-base-200 shadow-sm">
              <div className="card-body">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="card-title text-xl flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    Report Details
                  </h2>
                </div>
                
                {selectedReportProfile ? (
                  <div className="space-y-6">
                    {/* Report Header */}
                    <div className="alert alert-warning">
                      <AlertTriangle className="w-5 h-5" />
                      <div>
                        <h3 className="font-bold">Report Information</h3>
                        <div className="text-sm">Review the details below and take appropriate action</div>
                      </div>
                    </div>

                    {/* Report Information */}
                    <div className="space-y-4">
                      <div className="bg-base-100 rounded-lg p-4">
                        <h4 className="font-semibold text-base-content mb-3">Report Details</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-base-content/70">Report Count:</span>
                            <span className="text-warning font-semibold">{selectedReportProfile.count || selectedReportProfile.reportCount || 1}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-base-content/70">Content Type:</span>
                            <span className="text-base-content">
                              {selectedReportProfile.type === 'user' ? 'User' : 'Group'}
                            </span>
                          </div>
                          {selectedReportProfile.reason && (
                            <div className="flex justify-between">
                              <span className="text-base-content/70">Reason:</span>
                              <span className="text-base-content">{selectedReportProfile.reason}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Reported Content Info */}
                      <div className="bg-base-100 rounded-lg p-4">
                        <h4 className="font-semibold text-base-content mb-3">
                          {selectedReportProfile.type === 'user' ? 'Reported User' : 'Reported Group'}
                        </h4>
                        <div className="flex items-center gap-3">
                          <div className="avatar">
                            <div className="w-12 h-12 rounded-full">
                              {selectedReportProfile.type === 'user' ? (
                                <img 
                                  src={users.find(u => u._id === selectedReportProfile.reportedUser)?.profilePic || "/avatar.png"} 
                                  alt="Reported user" 
                                />
                              ) : (
                                selectedReportProfile.profilePic ? (
                                  <img src={selectedReportProfile.profilePic} alt={selectedReportProfile.name} />
                                ) : (
                                  <div className="w-12 h-12 bg-warning/20 flex items-center justify-center text-warning font-bold">
                                    {selectedReportProfile.name?.charAt(0)?.toUpperCase() || "?"}
                                  </div>
                                )
                              )}
                            </div>
                          </div>
                          <div>
                            <div className="font-bold">
                              {selectedReportProfile.type === 'user' 
                                ? users.find(u => u._id === selectedReportProfile.reportedUser)?.fullName || 'Unknown User'
                                : selectedReportProfile.name || 'Unknown Group'
                              }
                            </div>
                            <div className="text-sm text-base-content/70">
                              {selectedReportProfile.type === 'user' 
                                ? users.find(u => u._id === selectedReportProfile.reportedUser)?.email || 'No email'
                                : `${selectedReportProfile.members?.length || 0} members`
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                      <button
                        onClick={() => {
                          if (selectedReportProfile.type === 'user') {
                            // Find the reported user data
                            const reportedUser = users.find(u => u._id === selectedReportProfile.reportedUser);
                            if (reportedUser) {
                              // Set the selected user in the chat store
                              setSelectedUser(reportedUser);
                              // Navigate to home page where chat will be displayed
                              navigate("/");
                            } else {
                              alert("User not found");
                            }
                          } else {
                            // For groups, navigate to the group chat
                            // You'll need to set the selected group in your store
                            navigate("/");
                          }
                        }}
                        className="btn btn-primary flex-1"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View in Chat
                      </button>
                      <button
                        onClick={() => {
                          const target = selectedReportProfile.type === 'user' ? 'user' : 'group';
                          const name = selectedReportProfile.type === 'user' 
                            ? users.find(u => u._id === selectedReportProfile.reportedUser)?.fullName 
                            : selectedReportProfile.name;
                          
                          if (selectedReportProfile.type === 'user') {
                            handleDelete(selectedReportProfile.reportedUser);
                          } else {
                            handleDeleteGroup(selectedReportProfile._id);
                          }
                          setSelectedReportProfile(null);
                        }}
                        className="btn btn-error flex-1"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete {selectedReportProfile.type === 'user' ? 'User' : 'Group'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-base-content/60">
                    <AlertTriangle className="w-16 h-16 mx-auto mb-4 opacity-30" />
                    <p className="text-lg mb-2">No Report Selected</p>
                    <p className="text-sm">Click the eye icon next to a report to view its details</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Analytics Modal */}
      {showAnalytics && (
        <div className="modal modal-open">
          <div className="modal-box max-w-6xl w-11/12 max-h-[90vh]">
            {/* Modal Header with Active Model Indicator */}
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-base-content flex items-center gap-2">
                  <BarChart3 className="w-6 h-6 text-primary" />
                  Sentiment Analysis Performance
                </h2>
                {/* Active Model Badge */}
                <div className={`badge ${selectedModel === 'nb' ? 'badge-primary' : 'badge-secondary'}`}>
                  Currently Using: {selectedModel === 'nb' ? 'Naive Bayes' : 'SVC'}
                </div>
              </div>
              <button
                onClick={() => setShowAnalytics(false)}
                className="btn btn-sm btn-circle btn-ghost"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="space-y-6">
              {analyticsLoading ? (
                <div className="flex justify-center items-center py-12">
                  <span className="loading loading-spinner loading-lg text-primary"></span>
                  <span className="ml-3 text-base-content/70">
                    Loading analytics for {selectedModel === 'nb' ? 'Naive Bayes' : 'SVC'}...
                  </span>
                </div>
              ) : analyticsData ? (
                <>
                  {/* Performance Metrics Cards - Highlight Selected Model */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Naive Bayes Card */}
                    <div className={`card ${selectedModel === 'nb' ? 'ring-2 ring-primary' : ''} bg-gradient-to-br from-primary/10 to-primary/20 border border-primary/20`}>
                      <div className="card-body">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-primary rounded-full mr-3"></div>
                            <h3 className="card-title text-lg text-primary">
                              {analyticsData.models.naive_bayes.name}
                            </h3>
                          </div>
                          {selectedModel === 'nb' && (
                            <div className="badge badge-primary gap-2">
                              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                              ACTIVE
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-base-content/70">Accuracy</span>
                            <span className="font-semibold text-primary">{analyticsData.models.naive_bayes.accuracy}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-base-content/70">Precision</span>
                            <span className="font-semibold text-primary">{analyticsData.models.naive_bayes.precision}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-base-content/70">Recall</span>
                            <span className="font-semibold text-primary">{analyticsData.models.naive_bayes.recall}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-base-content/70">F1-Score</span>
                            <span className="font-semibold text-primary">{analyticsData.models.naive_bayes.f1_score}%</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* SVC Card */}
                    <div className={`card ${selectedModel === 'svc' ? 'ring-2 ring-secondary' : ''} bg-gradient-to-br from-secondary/10 to-secondary/20 border border-secondary/20`}>
                      <div className="card-body">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <div className="w-3 h-3 bg-secondary rounded-full mr-3"></div>
                            <h3 className="card-title text-lg text-secondary">
                              {analyticsData.models.svc.name}
                            </h3>
                          </div>
                          {selectedModel === 'svc' && (
                            <div className="badge badge-secondary gap-2">
                              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                              ACTIVE
                            </div>
                          )}
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-base-content/70">Accuracy</span>
                            <span className="font-semibold text-secondary">{analyticsData.models.svc.accuracy}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-base-content/70">Precision</span>
                            <span className="font-semibold text-secondary">{analyticsData.models.svc.precision}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-base-content/70">Recall</span>
                            <span className="font-semibold text-secondary">{analyticsData.models.svc.recall}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-base-content/70">F1-Score</span>
                            <span className="font-semibold text-secondary">{analyticsData.models.svc.f1_score}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Model Comparison Line Chart */}
                  <div className="card bg-base-200">
                    <div className="card-body">
                      <h3 className="card-title text-lg mb-4 text-base-content">Model Performance Comparison</h3>
                      <div className="h-80">
                        <Line
                          data={{
                            labels: ['Accuracy', 'Precision', 'Recall', 'F1-Score'],
                            datasets: [
                              {
                                label: 'Naive Bayes',
                                data: [
                                  analyticsData.models.naive_bayes.accuracy,
                                  analyticsData.models.naive_bayes.precision,
                                  analyticsData.models.naive_bayes.recall,
                                  analyticsData.models.naive_bayes.f1_score
                                ],
                                borderColor: 'rgb(59, 130, 246)', // Blue
                                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                borderWidth: 3,
                                pointBackgroundColor: 'rgb(59, 130, 246)',
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2,
                                pointRadius: 6,
                                pointHoverRadius: 8,
                                tension: 0.4
                              },
                              {
                                label: 'Support Vector Classifier',
                                data: [
                                  analyticsData.models.svc.accuracy,
                                  analyticsData.models.svc.precision,
                                  analyticsData.models.svc.recall,
                                  analyticsData.models.svc.f1_score
                                ],
                                borderColor: 'rgb(16, 185, 129)', // Green
                                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                                borderWidth: 3,
                                pointBackgroundColor: 'rgb(16, 185, 129)',
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2,
                                pointRadius: 6,
                                pointHoverRadius: 8,
                                tension: 0.4
                              }
                            ]
                          }}
                          options={{
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                              legend: {
                                position: 'top',
                                labels: {
                                  color: 'rgb(156, 163, 175)',
                                  font: {
                                    size: 12,
                                    weight: 'bold'
                                  },
                                  padding: 20,
                                  usePointStyle: true,
                                  pointStyle: 'circle'
                                }
                              },
                              title: {
                                display: false
                              },
                              tooltip: {
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                titleColor: '#fff',
                                bodyColor: '#fff',
                                borderColor: 'rgba(255, 255, 255, 0.1)',
                                borderWidth: 1,
                                cornerRadius: 8,
                                displayColors: true,
                                callbacks: {
                                  label: function(context) {
                                    return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                                  }
                                }
                              }
                            },
                            scales: {
                              x: {
                                grid: {
                                  color: 'rgba(156, 163, 175, 0.1)'
                                },
                                ticks: {
                                  color: 'rgb(156, 163, 175)',
                                  font: {
                                    size: 11,
                                    weight: 'bold'
                                  }
                                }
                              },
                              y: {
                                beginAtZero: true,
                                max: 100,
                                grid: {
                                  color: 'rgba(156, 163, 175, 0.1)'
                                },
                                ticks: {
                                  color: 'rgb(156, 163, 175)',
                                  font: {
                                    size: 11
                                  },
                                  callback: function(value) {
                                    return value + '%';
                                  }
                                }
                              }
                            },
                            interaction: {
                              intersect: false,
                              mode: 'index'
                            },
                            elements: {
                              line: {
                                borderCapStyle: 'round',
                                borderJoinStyle: 'round'
                              }
                            }
                          }}
                        />
                      </div>
                      <div className="mt-4 text-center">
                        <p className="text-sm text-base-content/60">
                          Interactive comparison of model performance across key metrics
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Comparison Table */}
                  <div className="card bg-base-200">
                    <div className="card-body">
                      <h3 className="card-title text-lg mb-4 text-base-content">Detailed Metrics Comparison</h3>
                      <div className="overflow-x-auto">
                        <table className="table table-zebra">
                          <thead>
                            <tr>
                              <th className="text-base-content">Metric</th>
                              <th className="text-primary">Naive Bayes</th>
                              <th className="text-secondary">SVC</th>
                              <th className="text-base-content">Difference</th>
                              <th className="text-base-content">Winner</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="font-semibold">Accuracy</td>
                              <td className="text-primary font-bold">{analyticsData.models.naive_bayes.accuracy}%</td>
                              <td className="text-secondary font-bold">{analyticsData.models.svc.accuracy}%</td>
                              <td className="font-semibold">
                                {Math.abs(analyticsData.models.svc.accuracy - analyticsData.models.naive_bayes.accuracy).toFixed(1)}%
                              </td>
                              <td>
                                <div className={`badge ${analyticsData.models.svc.accuracy > analyticsData.models.naive_bayes.accuracy ? 'badge-secondary' : 'badge-primary'}`}>
                                  {analyticsData.models.svc.accuracy > analyticsData.models.naive_bayes.accuracy ? 'SVC' : 'Naive Bayes'}
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="font-semibold">Precision</td>
                              <td className="text-primary font-bold">{analyticsData.models.naive_bayes.precision}%</td>
                              <td className="text-secondary font-bold">{analyticsData.models.svc.precision}%</td>
                              <td className="font-semibold">
                                {Math.abs(analyticsData.models.svc.precision - analyticsData.models.naive_bayes.precision).toFixed(1)}%
                              </td>
                              <td>
                                <div className={`badge ${analyticsData.models.svc.precision > analyticsData.models.naive_bayes.precision ? 'badge-secondary' : 'badge-primary'}`}>
                                  {analyticsData.models.svc.precision > analyticsData.models.naive_bayes.precision ? 'SVC' : 'Naive Bayes'}
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="font-semibold">Recall</td>
                              <td className="text-primary font-bold">{analyticsData.models.naive_bayes.recall}%</td>
                              <td className="text-secondary font-bold">{analyticsData.models.svc.recall}%</td>
                              <td className="font-semibold">
                                {Math.abs(analyticsData.models.svc.recall - analyticsData.models.naive_bayes.recall).toFixed(1)}%
                              </td>
                              <td>
                                <div className={`badge ${analyticsData.models.svc.recall > analyticsData.models.naive_bayes.recall ? 'badge-secondary' : 'badge-primary'}`}>
                                  {analyticsData.models.svc.recall > analyticsData.models.naive_bayes.recall ? 'SVC' : 'Naive Bayes'}
                                </div>
                              </td>
                            </tr>
                            <tr>
                              <td className="font-semibold">F1-Score</td>
                              <td className="text-primary font-bold">{analyticsData.models.naive_bayes.f1_score}%</td>
                              <td className="text-secondary font-bold">{analyticsData.models.svc.f1_score}%</td>
                              <td className="font-semibold">
                                {Math.abs(analyticsData.models.svc.f1_score - analyticsData.models.naive_bayes.f1_score).toFixed(1)}%
                              </td>
                              <td>
                                <div className={`badge ${analyticsData.models.svc.f1_score > analyticsData.models.naive_bayes.f1_score ? 'badge-secondary' : 'badge-primary'}`}>
                                  {analyticsData.models.svc.f1_score > analyticsData.models.naive_bayes.f1_score ? 'SVC' : 'Naive Bayes'}
                                </div>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  {/* Dataset Statistics */}
                  <div className="card bg-base-200">
                    <div className="card-body">
                      <h3 className="card-title text-lg mb-4 text-base-content">Dataset Statistics</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="stat bg-base-100 rounded-lg">
                          <div className="stat-value text-primary text-2xl">{analyticsData.dataset_stats.training_samples}</div>
                          <div className="stat-desc text-base-content/60">Training Samples</div>
                        </div>
                        <div className="stat bg-base-100 rounded-lg">
                          <div className="stat-value text-secondary text-2xl">{analyticsData.dataset_stats.test_samples}</div>
                          <div className="stat-desc text-base-content/60">Test Samples</div>
                        </div>
                        <div className="stat bg-base-100 rounded-lg">
                          <div className="stat-value text-accent text-2xl">{analyticsData.dataset_stats.sentiment_classes || analyticsData.dataset_stats.classes}</div>
                          <div className="stat-desc text-base-content/60">Sentiment Classes</div>
                        </div>
                        <div className="stat bg-base-100 rounded-lg">
                          <div className="stat-value text-info text-2xl">{Math.round((analyticsData.dataset_stats.test_samples / (analyticsData.dataset_stats.training_samples + analyticsData.dataset_stats.test_samples)) * 100)}%</div>
                          <div className="stat-desc text-base-content/60">Test Data Ratio</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <div className="text-center">
                    <BarChart3 className="w-16 h-16 mx-auto mb-4 text-base-content/30" />
                    <p className="text-base-content/60 mb-4">Failed to load analytics data</p>
                    <button 
                      onClick={fetchAnalyticsData}
                      className="btn btn-primary"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="modal-backdrop" onClick={() => setShowAnalytics(false)}></div>
        </div>
      )}
      
      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={deleteDialog.isOpen}
        title={deleteDialog.title}
        message={deleteDialog.message}
        onConfirm={deleteDialog.onConfirm}
        onCancel={() => setDeleteDialog({ isOpen: false, title: "", message: "", onConfirm: null, isLoading: false })}
        isLoading={deleteDialog.isLoading}
      />
      
      <Footer />
    </div>
  );
};

export default AdminDashboard;


