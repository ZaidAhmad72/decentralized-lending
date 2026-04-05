"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";
import Navbar from "@/components/Navbar";
import {
  createPrivatePool, joinPrivatePool, getUserPools,
  type PrivatePool,
} from "@/services/privatePoolService";
import PrivatePoolCard from "@/components/PrivatePoolCard";

export default function PrivatePoolsPage() {
  const supabase = createClient();
  const [userId, setUserId] = useState<string | null>(null);
  const [pools, setPools] = useState<PrivatePool[]>([]);
  const [loading, setLoading] = useState(true);

  // Create pool form
  const [showCreate, setShowCreate] = useState(false);
  const [poolName, setPoolName] = useState("");
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [maxMembers, setMaxMembers] = useState(10);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Join pool form
  const [showJoin, setShowJoin] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinSuccess, setJoinSuccess] = useState("");

  const loadPools = useCallback(async (uid: string) => {
    try {
      const data = await getUserPools(uid);
      setPools(data.filter(Boolean));
    } catch { /* silent */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        loadPools(user.id);
      } else {
        setLoading(false);
      }
    });
  }, [loadPools]);

  const handleCreate = async () => {
    if (!userId) return;
    setCreateError("");
    if (!poolName.trim()) { setCreateError("Pool name is required"); return; }
    setCreating(true);
    try {
      const pool = await createPrivatePool(userId, poolName, requiresApproval, maxMembers);
      setPools((prev) => [pool, ...prev]);
      setShowCreate(false);
      setPoolName("");
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create pool");
    }
    setCreating(false);
  };

  const handleJoin = async () => {
    if (!userId) return;
    setJoinError("");
    setJoinSuccess("");
    if (!joinCode.trim()) { setJoinError("Enter a join code"); return; }
    setJoining(true);
    try {
      const { pool, status } = await joinPrivatePool(userId, joinCode);
      if (status === "active") {
        setPools((prev) => [pool, ...prev]);
        setJoinSuccess("Joined successfully!");
      } else {
        setJoinSuccess("Request sent! Waiting for creator approval.");
      }
      setJoinCode("");
      setTimeout(() => { setShowJoin(false); setJoinSuccess(""); }, 2000);
    } catch (err) {
      setJoinError(err instanceof Error ? err.message : "Failed to join pool");
    }
    setJoining(false);
  };

  return (
    <div className="min-h-screen bg-[#eef2f7] dark:bg-gray-950 pb-24 lg:pb-10 lg:pt-20 transition-colors">
      <div className="max-w-4xl mx-auto px-5 lg:px-10">

        {/* Header */}
        <div className="flex items-center justify-between pt-10 pb-6 lg:pt-0">
          <div>
            <h1 className="text-3xl font-black text-[#111827] dark:text-white">Private Pools</h1>
            <p className="text-sm text-[#6b7280] dark:text-gray-400 mt-1">Group lending with anti-abuse protection</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowJoin(true); setShowCreate(false); }}
              className="px-4 py-2 rounded-xl text-sm font-bold border border-[#1a2fb8] text-[#1a2fb8] dark:text-blue-400 dark:border-blue-400 hover:bg-[#eef2ff] dark:hover:bg-blue-950 transition-colors"
            >
              Join Pool
            </button>
            <button
              onClick={() => { setShowCreate(true); setShowJoin(false); }}
              className="px-4 py-2 rounded-xl text-sm font-bold bg-[#1a2fb8] text-white hover:bg-[#1527a0] transition-colors"
            >
              + Create Pool
            </button>
          </div>
        </div>

        {/* Create Pool Form */}
        {showCreate && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-[#e5e9f0] dark:border-gray-700 mb-6">
            <h2 className="text-lg font-black text-[#111827] dark:text-white mb-4">Create Private Pool</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={poolName}
                onChange={(e) => setPoolName(e.target.value)}
                placeholder="Pool name (e.g. Friends & Family)"
                className="w-full rounded-xl px-4 py-3 text-sm border border-[#e5e9f0] dark:border-gray-600 bg-[#f9fafb] dark:bg-gray-700 text-[#111827] dark:text-white outline-none focus:border-[#1a2fb8]"
              />
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(Number(e.target.value))}
                  min={2} max={50}
                  className="w-24 rounded-xl px-3 py-3 text-sm border border-[#e5e9f0] dark:border-gray-600 bg-[#f9fafb] dark:bg-gray-700 text-[#111827] dark:text-white outline-none"
                />
                <span className="text-sm text-[#6b7280] dark:text-gray-400">max members</span>
                <label className="flex items-center gap-2 ml-auto cursor-pointer">
                  <input
                    type="checkbox"
                    checked={requiresApproval}
                    onChange={(e) => setRequiresApproval(e.target.checked)}
                    className="w-4 h-4 accent-[#1a2fb8]"
                  />
                  <span className="text-sm text-[#374151] dark:text-gray-300">Require approval to join</span>
                </label>
              </div>
              {createError && <p className="text-sm text-red-500">{createError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-[#1a2fb8] text-white disabled:opacity-50 hover:bg-[#1527a0] transition-colors"
                >
                  {creating ? "Creating..." : "Create Pool"}
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="px-4 py-3 rounded-xl font-bold text-sm bg-[#f3f4f6] dark:bg-gray-700 text-[#374151] dark:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Join Pool Form */}
        {showJoin && (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-[#e5e9f0] dark:border-gray-700 mb-6">
            <h2 className="text-lg font-black text-[#111827] dark:text-white mb-4">Join a Pool</h2>
            <div className="flex flex-col gap-3">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Enter 8-character join code"
                maxLength={8}
                className="w-full rounded-xl px-4 py-3 text-sm font-mono border border-[#e5e9f0] dark:border-gray-600 bg-[#f9fafb] dark:bg-gray-700 text-[#111827] dark:text-white outline-none focus:border-[#1a2fb8] tracking-widest"
              />
              {joinError && <p className="text-sm text-red-500">{joinError}</p>}
              {joinSuccess && <p className="text-sm text-green-600">{joinSuccess}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleJoin}
                  disabled={joining}
                  className="flex-1 py-3 rounded-xl font-bold text-sm bg-[#1a2fb8] text-white disabled:opacity-50 hover:bg-[#1527a0] transition-colors"
                >
                  {joining ? "Joining..." : "Join Pool"}
                </button>
                <button
                  onClick={() => setShowJoin(false)}
                  className="px-4 py-3 rounded-xl font-bold text-sm bg-[#f3f4f6] dark:bg-gray-700 text-[#374151] dark:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Pool List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.3" /><path d="M12 2a10 10 0 0 1 10 10" />
            </svg>
          </div>
        ) : pools.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-10 text-center border border-[#e5e9f0] dark:border-gray-700">
            <p className="text-[#9ca3af] dark:text-gray-500 text-sm mb-2">No private pools yet</p>
            <p className="text-xs text-[#9ca3af] dark:text-gray-600">Create a pool or join one with a code</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pools.map((pool) => (
              <PrivatePoolCard key={pool.id} pool={pool} userId={userId!} onDeleted={() => setPools((prev) => prev.filter((p) => p.id !== pool.id))} />
            ))}
          </div>
        )}
      </div>
      <Navbar />
    </div>
  );
}
