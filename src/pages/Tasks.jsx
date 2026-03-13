import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Search, Filter, Clock, Zap, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function Tasks() {
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const [difficultyFilter, setDifficultyFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortBy, setSortBy] = useState('deadline');
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchTasks = async () => {
            try {
                const { data, error } = await supabase
                    .from('tasks')
                    .select('*');
                if (error) throw error;
                setTasks(data || []);
            } catch (err) {
                console.error(err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchTasks();
    }, []);

    // Get unique roles from tasks
    const roles = ['all', ...new Set(tasks.map(t => t.role))];
    const difficulties = ['all', 'Easy', 'Medium', 'Hard'];
    const statuses = ['all', 'todo', 'in-progress', 'completed'];

    // Filter and sort tasks
    const filteredTasks = useMemo(() => {
        let result = tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                task.role.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesRole = roleFilter === 'all' || task.role === roleFilter;
            const matchesDifficulty = difficultyFilter === 'all' || task.difficulty === difficultyFilter;
            const matchesStatus = statusFilter === 'all' || task.status === statusFilter;

            return matchesSearch && matchesRole && matchesDifficulty && matchesStatus;
        });

        // Sort
        result.sort((a, b) => {
            switch (sortBy) {
                case 'deadline':
                    return new Date(a.deadline) - new Date(b.deadline);
                case 'difficulty':
                    const diffOrder = { 'Easy': 1, 'Medium': 2, 'Hard': 3 };
                    return diffOrder[a.difficulty] - diffOrder[b.difficulty];
                case 'title':
                    return a.title.localeCompare(b.title);
                default:
                    return 0;
            }
        });

        return result;
    }, [tasks, searchQuery, roleFilter, difficultyFilter, statusFilter, sortBy]);

    const getStatusIcon = (status) => {
        switch (status) {
            case 'completed':
                return <CheckCircle2 className="h-5 w-5 text-green-500" />;
            case 'in-progress':
                return <Zap className="h-5 w-5 text-amber-500" />;
            default:
                return <AlertCircle className="h-5 w-5 text-gray-400" />;
        }
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty) {
            case 'Easy':
                return 'bg-green-900/30 text-green-300';
            case 'Medium':
                return 'bg-amber-900/30 text-amber-300';
            case 'Hard':
                return 'bg-red-900/30 text-red-300';
            default:
                return 'bg-gray-900/30 text-gray-300';
        }
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (date.toDateString() === today.toDateString()) {
            return ` Today`;
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        }

        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const isOverdue = (deadline) => {
        return new Date(deadline) < new Date() && formatDate(deadline) !== 'Today';
    };

    if (loading) {
        return <div className="flex justify-center items-center h-64">Loading tasks...</div>;
    }

    if (error) {
        return <div className="flex justify-center items-center h-64 text-red-500">Error: {error}</div>;
    }

    const generateTask = async () => {
        try {
            const res = await fetch(
                "https://ttweevkkvqpjzbmrnack.supabase.co/functions/v1/generate-task",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({
                        role: "fullstack"
                    })
                }
            )

            const data = await res.json()

            console.log("Generated task:", data)
        } catch (err) {
            console.error(err)
        }
    }

    return (
        <div className="flex flex-col gap-8 pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                        My Tasks
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">
                        {filteredTasks.length} {filteredTasks.length === 1 ? 'task' : 'tasks'} · {tasks.filter(t => t.status === 'completed').length} completed
                    </p>
                </div>
                <Button onClick={generateTask} size="sm" className="gap-2 shrink-0">
                    <Zap className="h-4 w-4" /> Generate Task
                </Button>
            </div>

            {/* Search and Filters */}
            <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search tasks by title or role..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-experr-500 text-gray-900 dark:text-gray-100"
                    />
                </div>

                {/* Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            <Filter className="inline h-4 w-4 mr-2" /> Role
                        </label>
                        <select
                            value={roleFilter}
                            onChange={(e) => setRoleFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-experr-500 text-gray-900 dark:text-gray-100"
                        >
                            {roles.map(role => (
                                <option key={role} value={role}>
                                    {role === 'all' ? 'All Roles' : role}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Difficulty
                        </label>
                        <select
                            value={difficultyFilter}
                            onChange={(e) => setDifficultyFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-experr-500 text-gray-900 dark:text-gray-100"
                        >
                            {difficulties.map(diff => (
                                <option key={diff} value={diff}>
                                    {diff === 'all' ? 'All Levels' : diff}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Status
                        </label>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-experr-500 text-gray-900 dark:text-gray-100"
                        >
                            <option value="all">All Status</option>
                            <option value="todo">Not Started</option>
                            <option value="in-progress">In Progress</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Sort By
                        </label>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value)}
                            className="w-full px-3 py-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-experr-500 text-gray-900 dark:text-gray-100"
                        >
                            <option value="deadline">Deadline</option>
                            <option value="difficulty">Difficulty</option>
                            <option value="title">Title</option>
                        </select>
                    </div>

                    <div className="flex items-end">
                        <Button
                            variant="secondary"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                                setSearchQuery('');
                                setRoleFilter('all');
                                setDifficultyFilter('all');
                                setStatusFilter('all');
                                setSortBy('deadline');
                            }}
                        >
                            Reset Filters
                        </Button>
                    </div>
                </div>
            </div>

            {/* Tasks Grid */}
            {filteredTasks.length === 0 ? (
                <Card className="flex flex-col items-center justify-center py-16">
                    <CardContent className="text-center">
                        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">No tasks found</h3>
                        <p className="text-gray-500 dark:text-gray-400 mb-4">Try adjusting your filters</p>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setSearchQuery('');
                                setRoleFilter('all');
                                setDifficultyFilter('all');
                                setStatusFilter('all');
                            }}
                        >
                            Clear Filters
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {filteredTasks.map((task) => (
                        <Card key={task.id} className="hover:shadow-lg transition-shadow overflow-hidden">
                            <CardContent className="p-0">
                                <Link to={`/tasks/${task.id}`} className="block p-6 hover:bg-gray-50 dark:hover:bg-dark-800 transition-colors">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="mt-1">
                                                {getStatusIcon(task.status)}
                                            </div>
                                            <div className="flex-1">
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                                    {task.title}
                                                </h3>
                                                <div className="flex flex-wrap gap-2 items-center">
                                                    <Badge variant="primary" className="text-xs">
                                                        {task.role}
                                                    </Badge>
                                                    <Badge variant={getDifficultyColor(task.difficulty)} className="text-xs">
                                                        {task.difficulty}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-xs">
                                                        {task.company}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end gap-2">
                                            <div className={`flex items-center gap-1 text-sm font-medium ${isOverdue(task.deadline) ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'
                                                }`}>
                                                <Clock className="h-4 w-4" />
                                                {isOverdue(task.deadline) ? '⚠️ ' : ''}{formatDate(task.deadline)}
                                            </div>
                                            <div className="text-xs text-gray-500 dark:text-gray-400">
                                                {task.estimatedTime}
                                            </div>
                                        </div>
                                    </div>

                                    {task.description && (
                                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-dark-700">
                                            <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
                                                {task.description.split('\n')[0].replace('## ', '')}
                                            </p>
                                        </div>
                                    )}
                                </Link>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Stats Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Tasks Completed</CardDescription>
                        <CardTitle className="text-2xl">{tasks.filter(t => t.status === 'completed').length}/{tasks.length}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ProgressBar value={tasks.filter(t => t.status === 'completed').length} max={tasks.length} />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                            {Math.round((tasks.filter(t => t.status === 'completed').length / tasks.length) * 100)}% completion rate
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>In Progress</CardDescription>
                        <CardTitle className="text-2xl">{tasks.filter(t => t.status === 'in-progress').length}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-amber-500 font-medium">
                            {tasks.filter(t => t.status === 'in-progress' && isOverdue(t.deadline)).length} overdue
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Not Started</CardDescription>
                        <CardTitle className="text-2xl">{tasks.filter(t => t.status === 'todo').length}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Awaiting your attention
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
