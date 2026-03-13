import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Play,
  Save,
  CheckCircle2,
  FileText,
  Send,
  AlertCircle,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { supabase } from "../../lib/supabase";

export default function TaskSimulation() {
  const { id } = useParams();
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState("description");

  useEffect(() => {
    console.log("TaskSimulation: useEffect triggered with id:", id);
    const fetchTask = async () => {
      try {
        // Accept any non-empty ID
        if (!id || typeof id !== "string" || id.trim() === "") {
          console.log("TaskSimulation: Invalid task ID:", id);
          setError("Invalid task ID");
          setLoading(false);
          return;
        }
        console.log("TaskSimulation: Fetching task with id:", id);
        const { data, error } = await supabase
          .from("tasks")
          .select("*")
          .eq("id", id)
          .single();
        if (error) {
          console.log("TaskSimulation: Supabase error:", error);
          setError("Task not found");
          setTask(null);
          setLoading(false);
          return;
        }
        if (!data) {
          console.log("TaskSimulation: No data returned");
          setError("Task not found");
          setTask(null);
          setLoading(false);
          return;
        }
        console.log("TaskSimulation: Task data received:", data);
        setTask(data);
        setCode(data.starterCode || "");
      } catch (err) {
        console.error("TaskSimulation: Error fetching task:", err);
        setError(err.message);
      } finally {
        console.log("TaskSimulation: Setting loading to false");
        setLoading(false);
      }
    };
    fetchTask();
  }, [id]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("submissions").insert({
        user_id: user.id,
        task_id: id,
        solution_code: code,
        status: "pending",
        submitted_at: new Date().toISOString(),
      });
      if (error) throw error;
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      alert("Submission failed: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderMarkdown = (text) => {
    return text.split("\n").map((line, i) => {
      if (line.startsWith("### ")) {
        return (
          <h3
            key={i}
            className="text-base font-semibold text-gray-900 dark:text-white mt-4 mb-2"
          >
            {line.replace("### ", "")}
          </h3>
        );
      }
      if (line.startsWith("## ")) {
        return (
          <h2
            key={i}
            className="text-lg font-bold text-gray-900 dark:text-white mt-6 mb-3"
          >
            {line.replace("## ", "")}
          </h2>
        );
      }
      if (line.startsWith("* ")) {
        return (
          <li
            key={i}
            className="text-sm text-gray-700 dark:text-gray-300 ml-4 mb-2"
          >
            {line.replace("* ", "")}
          </li>
        );
      }
      if (line.startsWith("1. ")) {
        return (
          <li
            key={i}
            className="text-sm text-gray-700 dark:text-gray-300 ml-4 mb-2"
            style={{ listStyleType: "decimal" }}
          >
            {line.replace(/^\d+\.\s/, "")}
          </li>
        );
      }
      if (line.trim()) {
        return (
          <p key={i} className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            {line}
          </p>
        );
      }
      return null;
    });
  };

  console.log(
    "TaskSimulation: Render - loading:",
    loading,
    "error:",
    error,
    "task:",
    task,
  );

  if (loading) {
    console.log("TaskSimulation: Showing loading screen");
    return (
      <div className="flex justify-center items-center h-64">
        Loading task...
      </div>
    );
  }

  if (error) {
    console.log("TaskSimulation: Showing error screen:", error);
    return (
      <div className="flex justify-center items-center h-64 text-red-500">
        Error: {error}
      </div>
    );
  }

  if (!task || !task.title || !task.description) {
    console.log("TaskSimulation: Task data incomplete:", task);
    return (
      <div className="flex justify-center items-center h-64">
        Task data incomplete
      </div>
    );
  }

  console.log("TaskSimulation: Showing task content for:", task.title);

  const submitTask = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    console.log("Submit button clicked");

    if (!session) {
      console.error("User not logged in");
      return;
    }

    if (!task) {
      console.error("Task not loaded yet");
      return;
    }

    const userId = session.user.id;

    const { data: submission, error } = await supabase
      .from("submissions")
      .insert({
        user_id: userId,
        task_id: task.id,
        solution_code: code,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      console.error("Submission insert error:", error);
      return;
    }

    console.log("Submission created:", submission);

    try {
      const res = await fetch(
        "https://ttweevkkvqpjzbmrnack.supabase.co/functions/v1/evaluate-submission",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            solution: code,
            task_description: task.task_description,
            user_id: userId,
            submission_id: submission.id,
          }),
        },
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Edge function error:", errorText);
        return;
      }

      const data = await res.json();
      console.log("Evaluation result:", data);
    } catch (err) {
      console.error("Submit error:", err);
    }
  };
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 bg-white dark:bg-dark-900">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200 dark:border-dark-700">
        <div className="flex items-center gap-4">
          <Link to="/tasks">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              {task?.title || "Task Title"}
              <Badge
                variant={
                  task?.difficulty === "Hard"
                    ? "danger"
                    : task?.difficulty === "Medium"
                      ? "warning"
                      : "success"
                }
              >
                {task?.difficulty || "Easy"}
              </Badge>
            </h1>
            <div className="flex gap-4 text-sm text-gray-500 dark:text-gray-400 mt-1">
              <span>{task?.role || "Role"}</span>
              <span>•</span>
              <span>{task?.company || "Company"}</span>
              <span>•</span>
              <span>{task?.estimatedTime || "Time"}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" className="gap-2">
            <Save className="h-4 w-4" /> Save Draft
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={submitTask}
            disabled={submitting || submitted}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <Play className="h-4 w-4 animate-spin" /> Running...
              </span>
            ) : submitted ? (
              <span className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" /> Submitted
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Send className="h-4 w-4" /> Submit Task
              </span>
            )}
          </Button>
        </div>
      </div>

      {submitted && (
        <Card className="bg-green-900/20 border-green-800 border-2">
          <CardContent className="pt-4 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-black">
                Task submitted successfully!
              </p>
              <p className="text-sm text-black">
                Your code will review shortly.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Split Pane */}
      <div className="flex flex-1 overflow-hidden gap-4">
        {/* Left Pane - Description */}
        <div className="flex-1 flex flex-col overflow-hidden bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-dark-700 shadow-sm">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-dark-700">
            {["description", "resources"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab
                    ? "border-experr-500 text-experr-500"
                    : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-300"
                }`}
              >
                {tab === "description" ? "Description" : "Resources"}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
            {activeTab === "description" ? (
              <div className="prose prose-sm prose-slate dark:prose-invert max-w-none">
                {renderMarkdown(
                  task?.description || "Task description not available.",
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                    Learning Resources
                  </h3>
                  <div className="space-y-2">
                    {[
                      { title: "Official Documentation", url: "#" },
                      { title: "Best Practices Guide", url: "#" },
                      { title: "Code Examples", url: "#" },
                    ].map((resource, i) => (
                      <a
                        key={i}
                        href={resource.url}
                        className="block p-3 text-sm font-medium text-experr-500 hover:text-experr-400 bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-dark-700 hover:border-experr-500 transition-colors"
                      >
                        {resource.title} →
                      </a>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 pt-4">
                    Attached Files
                  </h3>
                  <div className="flex gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-700"
                    >
                      auth.config.js
                    </Badge>
                    <Badge
                      variant="outline"
                      className="cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-700"
                    >
                      package.json
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Pane - Editor */}
        <div className="flex-[1.2] flex flex-col overflow-hidden bg-dark-950 rounded-lg border border-gray-200 dark:border-dark-700 shadow-sm font-mono">
          <div className="flex items-center justify-between px-4 py-3 bg-dark-900 border-b border-dark-800 text-sm text-gray-400 sticky top-0">
            <span className="font-medium">solution.js</span>
            <span className="text-xs">JavaScript</span>
          </div>
          <div className="flex-1 flex overflow-hidden relative">
            {/* Line numbers */}
            <div className="w-12 bg-dark-950 border-r border-dark-800 flex flex-col text-right pr-4 py-4 text-gray-400 text-sm select-none overflow-y-auto">
              {code.split("\n").map((_, i) => (
                <div key={i} className="h-6 leading-6">
                  {i + 1}
                </div>
              ))}
            </div>
            {/* Editor */}
            <div className="flex-1 p-4 overflow-auto relative">
              <textarea
                className="w-full h-full bg-transparent text-black focus:outline-none resize-none font-mono text-sm leading-6"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="// Write your solution here"
                spellCheck="false"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
