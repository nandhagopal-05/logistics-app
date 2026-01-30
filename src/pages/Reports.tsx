import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { shipmentsAPI } from '../services/api';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import { Loader2, Calendar as CalendarIcon } from 'lucide-react';

interface Shipment {
    id: string;

    created_at: string;
    status: string;
    payment_status?: string;
    [key: string]: any;
}

const Reports: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [daysRange, setDaysRange] = useState(30);
    const [shipments, setShipments] = useState<Shipment[]>([]);
    const [chartData, setChartData] = useState<any[]>([]);

    // Summary Stats (for the selected range)
    const [stats, setStats] = useState({
        created: 0,


        completed: 0
    });

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        processData();
    }, [daysRange, shipments]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const response = await shipmentsAPI.getAll();
            const data = response.data || [];
            setShipments(data);
        } catch (error) {
            console.error("Failed to fetch report data", error);
        } finally {
            setLoading(false);
        }
    };

    const processData = () => {
        if (!shipments.length) return;

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(endDate.getDate() - daysRange);

        // Filter shipments created within the range
        // Note: We are analyzing "Jobs Created" in this range, and their CURRENT status.
        const rangeShipments = shipments.filter(s => {
            const d = new Date(s.created_at);
            // Set hours, minutes, seconds, milliseconds to 0 for accurate date comparison
            d.setHours(0, 0, 0, 0);
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999); // Include the whole end day
            return d >= start && d <= end;
        });

        // Calculate Stats for the cards (Aggregated for the range)
        let created = 0;


        let completed = 0;


        rangeShipments.forEach(s => {
            created++;
            const status = s.status?.toLowerCase() || '';


            if (status !== 'cancelled' && status !== 'terminated') {
                if (status === 'completed') {
                    completed++;







                }
            }
        });

        setStats({ created, completed });

        // Prepare Daily Data for Chart
        const dailyDataMap = new Map();

        // Initialize all days in range with 0
        for (let i = 0; i <= daysRange; i++) {
            const d = new Date(startDate);
            d.setDate(d.getDate() + i);
            const dateStr = d.toISOString().split('T')[0];
            dailyDataMap.set(dateStr, {
                date: dateStr,
                displayDate: `${d.getDate()}/${d.getMonth() + 1}`,
                Created: 0,


                Completed: 0
            });
        }

        rangeShipments.forEach(s => {
            const dateStr = new Date(s.created_at).toISOString().split('T')[0];
            if (dailyDataMap.has(dateStr)) {
                const dayStats = dailyDataMap.get(dateStr);
                const status = s.status?.toLowerCase() || '';


                dayStats.Created += 1;

                if (status !== 'cancelled' && status !== 'terminated') {
                    if (status === 'completed') {
                        dayStats.Completed += 1;






                    }
                }
            }
        });

        setChartData(Array.from(dailyDataMap.values()));
    };

    const ranges = [5, 15, 30, 45, 60];

    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            // Find the display date from the payload or format the label
            return (
                <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg text-sm">
                    <p className="font-bold text-gray-900 mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }}></div>
                            <span className="text-gray-600 font-medium">{entry.name}:</span>
                            <span className="font-bold text-gray-900">{entry.value}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <Layout>
            <div className="p-8 font-sans animate-fade-in pb-20">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
                        <p className="text-gray-500 mt-1">Performance metrics over time</p>
                    </div>

                    <div className="flex items-center gap-2 bg-white p-1 rounded-lg border border-gray-200 shadow-sm">
                        {ranges.map(r => (
                            <button
                                key={r}
                                onClick={() => setDaysRange(r)}
                                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${daysRange === r
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:bg-gray-100'
                                    }`}
                            >
                                Last {r} Days
                            </button>
                        ))}
                    </div>
                </div>

                {loading ? (
                    <div className="flex justify-center items-center h-96">
                        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* KPI Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-blue-500">
                                <p className="text-gray-500 text-sm font-medium">Jobs Created</p>
                                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.created}</h3>
                                <p className="text-xs text-gray-400 mt-1">in last {daysRange} days</p>
                            </div>





                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 border-l-4 border-l-green-500">
                                <p className="text-gray-500 text-sm font-medium">Completed</p>
                                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.completed}</h3>
                                <p className="text-xs text-gray-400 mt-1">Delivered</p>
                            </div>


                        </div>

                        {/* Chart */}
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <CalendarIcon className="w-5 h-5 text-indigo-600" />
                                Job Trends (Daily)
                            </h3>
                            <div className="h-[450px] w-full mt-4">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={chartData}
                                        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                                        <XAxis
                                            dataKey="displayDate"
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#6B7280', fontSize: 12 }}
                                            dy={10}
                                        />
                                        <YAxis
                                            allowDecimals={false}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#6B7280', fontSize: 12 }}
                                        />
                                        <Tooltip content={<CustomTooltip />} />
                                        <Legend wrapperStyle={{ paddingTop: '20px' }} />

                                        <Line
                                            type="monotone"
                                            dataKey="Created"
                                            stroke="#3B82F6"
                                            strokeWidth={3}
                                            dot={{ r: 4, strokeWidth: 2 }}
                                            activeDot={{ r: 6 }}
                                            name="Jobs Created"
                                        />


                                        <Line
                                            type="monotone"
                                            dataKey="Completed"
                                            stroke="#10B981"
                                            strokeWidth={3}
                                            dot={{ r: 4, strokeWidth: 2 }}
                                            activeDot={{ r: 6 }}
                                            name="Completed"
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default Reports;
