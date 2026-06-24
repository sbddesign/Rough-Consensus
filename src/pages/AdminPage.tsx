import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Debate, Phase } from "../types";
import { supabase } from "../services/supabase";
import AdminPhaseController from "../components/admin/AdminPhaseController";
import Header from "../components/layout/Header";
import Button from "../components/ui/Button";
import { Trash2, Link as LinkIcon, Check } from "lucide-react";
import {
  coerceDebateFromDb,
  coerceDebateListFromDb,
  getPhaseDisplay,
} from "../lib/utils";
import Footer from "../components/layout/Footer";

const AdminPage: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [debates, setDebates] = useState<Debate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDebate, setSelectedDebate] = useState<Debate | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [copiedDebateId, setCopiedDebateId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });

  // Fetch debates from Supabase
  useEffect(() => {
    const fetchDebates = async () => {
      try {
        const { data, error } = await supabase
          .from("debates")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Map database column names to our interface names
        const mappedDebates = coerceDebateListFromDb(data || []);

        setDebates(mappedDebates);
      } catch (error) {
        console.error("Error fetching debates:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDebates();
  }, []);

  // Check if user is admin, if not redirect to home
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        Loading...
      </div>
    );
  }

  if (!currentUser || !currentUser.isAdmin) {
    return <Navigate to="/" replace />;
  }

  const handleCreateDebate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !currentUser) return;

    try {
      const newDebate = {
        title: formData.title,
        description: formData.description,
        current_phase: "scheduled" as const,
        created_by: currentUser.id,
      };

      const { data, error } = await supabase
        .from("debates")
        .insert([newDebate])
        .select()
        .single();

      if (error) throw error;

      // Add the new debate to the list
      const mappedDebate: Debate = coerceDebateFromDb(data);

      setDebates([mappedDebate, ...debates]);
      setFormData({ title: "", description: "" });
      setShowForm(false);
    } catch (error) {
      console.error("Error creating debate:", error);
    }
  };

  const handleCopyInviteLink = async (debateId: string) => {
    const inviteLink = `${window.location.origin}/?id=${debateId}`;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopiedDebateId(debateId);
      setTimeout(() => setCopiedDebateId(null), 2000);
    } catch (error) {
      console.error("Error copying invite link:", error);
    }
  };

  const handleUpdatePhase = async (debateId: string, phase: Phase) => {
    try {
      const { error } = await supabase
        .from("debates")
        .update({ current_phase: phase })
        .eq("id", debateId);

      if (error) throw error;

      // Update local state
      setDebates(
        debates.map((debate) =>
          debate.id === debateId ? { ...debate, currentPhase: phase } : debate
        )
      );

      if (selectedDebate && selectedDebate.id === debateId) {
        setSelectedDebate({ ...selectedDebate, currentPhase: phase });
      }
    } catch (error) {
      console.error("Error updating debate phase:", error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header title="Admin Dashboard" showBack />
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8 max-w-7xl">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 sm:gap-6 mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold">Debates</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="w-full sm:w-auto bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors"
          >
            {showForm ? "Cancel" : "Create New Debate"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white shadow-md rounded-lg p-4 sm:p-6 mb-6">
            <h3 className="text-lg sm:text-xl font-semibold mb-4">
              Create New Debate
            </h3>
            <form onSubmit={handleCreateDebate} className="space-y-4">
              <div>
                <label
                  htmlFor="title"
                  className="block text-gray-700 font-medium mb-2"
                >
                  Title
                </label>
                <input
                  type="text"
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="description"
                  className="block text-gray-700 font-medium mb-2"
                >
                  Description
                </label>
                <textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              </div>
              <button
                type="submit"
                className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg transition-colors"
              >
                Create Debate
              </button>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-4">Loading debates...</div>
        ) : debates.length === 0 ? (
          <div className="text-center py-4">
            No debates found. Create one to get started.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {debates.map((debate) => (
              <div
                key={debate.id}
                className="bg-white shadow-md rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-4 sm:p-6 space-y-3">
                  <span className="flex items-center justify-between">
                    <h3 className="text-lg sm:text-xl font-semibold line-clamp-2">
                      {debate.title}
                    </h3>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => console.log("delete")}
                      icon={<Trash2 className="h-4 w-4" />}
                      className="ml-2 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 hover:border-red-300"
                      aria-label="Delete debate"
                    >
                      <span className="sr-only">Delete</span>
                    </Button>
                  </span>
                  <p className="text-gray-600 text-sm sm:text-base line-clamp-3">
                    {debate.description || "No description provided"}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:justify-between">
                    <span
                      className={`inline-flex px-3 py-1 rounded-full text-sm font-medium w-fit ${
                        debate.currentPhase === "scheduled"
                          ? "bg-blue-100 text-blue-800"
                          : debate.currentPhase === "pre"
                            ? "bg-yellow-100 text-yellow-800"
                            : debate.currentPhase === "post"
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {getPhaseDisplay(debate.currentPhase)}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(debate.startTime).toLocaleDateString()}
                    </span>
                  </div>
                  <AdminPhaseController
                    debateId={debate.id}
                    currentPhase={debate.currentPhase}
                    onUpdatePhase={handleUpdatePhase}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCopyInviteLink(debate.id)}
                    icon={
                      copiedDebateId === debate.id ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <LinkIcon className="h-4 w-4" />
                      )
                    }
                    className="w-full gap-2"
                    aria-label="Copy participant invite link"
                  >
                    {copiedDebateId === debate.id
                      ? "Copied!"
                      : "Copy invite link"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default AdminPage;
