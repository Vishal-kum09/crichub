import { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, RadarChart, Cell } from 'recharts';

interface AnalyticsProps {
  matchId?: string;
  onNavigate: (path: string) => void;
}

export function Analytics({ matchId, onNavigate }: AnalyticsProps) {
  const [activeView, setActiveView] = useState<'wagon-wheel' | 'manhattan' | 'run-rate' | 'partnership' | 'bowling-heatmap' | 'win-probability'>('wagon-wheel');

  // Mock Wagon Wheel Data (shot placement)
  const wagonWheelData = [
    { angle: 0, distance: 85, runs: 6, shot: 'Straight Drive' },
    { angle: 30, distance: 75, runs: 4, shot: 'Cover Drive' },
    { angle: 60, distance: 90, runs: 6, shot: 'Square Cut' },
    { angle: 90, distance: 70, runs: 4, shot: 'Pull Shot' },
    { angle: 120, distance: 65, runs: 2, shot: 'Flick' },
    { angle: 150, distance: 80, runs: 4, shot: 'Sweep' },
    { angle: 180, distance: 88, runs: 6, shot: 'Reverse Sweep' },
    { angle: 210, distance: 55, runs: 2, shot: 'Leg Glance' },
    { angle: 240, distance: 92, runs: 6, shot: 'Hook Shot' },
    { angle: 270, distance: 78, runs: 4, shot: 'Cut Shot' },
    { angle: 300, distance: 68, runs: 2, shot: 'Late Cut' },
    { angle: 330, distance: 85, runs: 4, shot: 'Off Drive' },
  ];

  // Manhattan Graph Data (runs per over)
  const manhattanData = [
    { over: 1, runs: 8, wickets: 0 },
    { over: 2, runs: 12, wickets: 0 },
    { over: 3, runs: 6, wickets: 1 },
    { over: 4, runs: 15, wickets: 0 },
    { over: 5, runs: 9, wickets: 0 },
    { over: 6, runs: 18, wickets: 0 },
    { over: 7, runs: 7, wickets: 1 },
    { over: 8, runs: 11, wickets: 0 },
    { over: 9, runs: 14, wickets: 0 },
    { over: 10, runs: 10, wickets: 1 },
    { over: 11, runs: 13, wickets: 0 },
    { over: 12, runs: 16, wickets: 0 },
    { over: 13, runs: 9, wickets: 1 },
    { over: 14, runs: 12, wickets: 0 },
    { over: 15, runs: 19, wickets: 0 },
    { over: 16, runs: 14, wickets: 1 },
    { over: 17, runs: 17, wickets: 0 },
    { over: 18, runs: 15, wickets: 0 },
    { over: 19, runs: 21, wickets: 0 },
    { over: 20, runs: 18, wickets: 1 },
  ];

  // Run Rate Graph Data
  const runRateData = [
    { over: 1, teamA: 8.0, teamB: 0, required: 0 },
    { over: 2, teamA: 10.0, teamB: 0, required: 0 },
    { over: 3, teamA: 8.67, teamB: 0, required: 0 },
    { over: 4, teamA: 10.25, teamB: 0, required: 0 },
    { over: 5, teamA: 10.0, teamB: 0, required: 0 },
    { over: 6, teamA: 11.33, teamB: 0, required: 0 },
    { over: 7, teamA: 10.71, teamB: 0, required: 0 },
    { over: 8, teamA: 10.75, teamB: 0, required: 0 },
    { over: 9, teamA: 11.11, teamB: 0, required: 0 },
    { over: 10, teamA: 11.1, teamB: 0, required: 0 },
    { over: 11, teamA: 11.27, teamB: 6.5, required: 11.5 },
    { over: 12, teamA: 11.58, teamB: 7.0, required: 11.8 },
    { over: 13, teamA: 11.38, teamB: 7.2, required: 12.0 },
    { over: 14, teamA: 11.43, teamB: 7.5, required: 12.5 },
    { over: 15, teamA: 11.8, teamB: 8.0, required: 13.0 },
    { over: 16, teamA: 11.88, teamB: 8.3, required: 13.5 },
    { over: 17, teamA: 12.0, teamB: 8.8, required: 14.0 },
    { over: 18, teamA: 12.0, teamB: 9.2, required: 14.8 },
    { over: 19, teamA: 12.26, teamB: 9.8, required: 15.5 },
    { over: 20, teamA: 12.25, teamB: 10.2, required: 16.2 },
  ];

  // Partnership Graph Data
  const partnershipData = [
    { partnership: '1st', runs: 42, balls: 28, batsmen: 'Rohit & Virat' },
    { partnership: '2nd', runs: 67, balls: 45, batsmen: 'Virat & SKY' },
    { partnership: '3rd', runs: 54, balls: 32, batsmen: 'SKY & Hardik' },
    { partnership: '4th', runs: 38, balls: 24, batsmen: 'Hardik & Jadeja' },
    { partnership: '5th', runs: 24, balls: 18, batsmen: 'Jadeja & Rahul' },
  ];

  // Bowling Heatmap Data (pitch zones)
  const bowlingHeatmapData = [
    // Good length zones
    { zone: 'Good-Off', deliveries: 45, runs: 28, wickets: 2 },
    { zone: 'Good-Middle', deliveries: 38, runs: 35, wickets: 1 },
    { zone: 'Good-Leg', deliveries: 42, runs: 48, wickets: 0 },

    // Short length zones
    { zone: 'Short-Off', deliveries: 18, runs: 32, wickets: 0 },
    { zone: 'Short-Middle', deliveries: 15, runs: 28, wickets: 1 },
    { zone: 'Short-Leg', deliveries: 20, runs: 36, wickets: 0 },

    // Full length zones
    { zone: 'Full-Off', deliveries: 35, runs: 22, wickets: 3 },
    { zone: 'Full-Middle', deliveries: 30, runs: 38, wickets: 1 },
    { zone: 'Full-Leg', deliveries: 28, runs: 42, wickets: 0 },
  ];

  // Win Probability Curve Data
  const winProbabilityData = [
    { over: 0, teamA: 50, teamB: 50 },
    { over: 2, teamA: 55, teamB: 45 },
    { over: 4, teamA: 58, teamB: 42 },
    { over: 6, teamA: 65, teamB: 35 },
    { over: 8, teamA: 62, teamB: 38 },
    { over: 10, teamA: 68, teamB: 32 },
    { over: 12, teamA: 45, teamB: 55 },
    { over: 14, teamA: 42, teamB: 58 },
    { over: 16, teamA: 38, teamB: 62 },
    { over: 18, teamA: 35, teamB: 65 },
    { over: 20, teamA: 30, teamB: 70 },
  ];

  const views = [
    { id: 'wagon-wheel', label: 'Wagon Wheel' },
    { id: 'manhattan', label: 'Manhattan' },
    { id: 'run-rate', label: 'Run Rate' },
    { id: 'partnership', label: 'Partnerships' },
    { id: 'bowling-heatmap', label: 'Bowling Heatmap' },
    { id: 'win-probability', label: 'Win Probability' },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a] text-white p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <button
          onClick={() => onNavigate('/matches')}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors mb-6"
        >
          <ArrowLeft size={20} />
          <span>Back to Matches</span>
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              Match Analytics
            </h1>
            <p className="text-white/60">Broadcast-Grade Visualization Engine</p>
          </div>
        </div>
      </div>

      {/* View Selector */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex gap-3 overflow-x-auto pb-2">
          {views.map((view) => (
            <button
              key={view.id}
              onClick={() => setActiveView(view.id)}
              className={`px-6 py-3 rounded-xl font-semibold whitespace-nowrap transition-all ${
                activeView === view.id
                  ? 'bg-gradient-to-r from-[#e60023] to-[#ff1744] text-white shadow-lg shadow-red-500/50 scale-105'
                  : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
              }`}
            >
              {view.label}
            </button>
          ))}
        </div>
      </div>

      {/* Analytics Display */}
      <div className="max-w-7xl mx-auto">
        {/* Wagon Wheel */}
        {activeView === 'wagon-wheel' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold mb-6">Wagon Wheel - Shot Distribution</h2>
            <p className="text-white/60 mb-8">Visual representation of where runs were scored around the ground</p>

            <div className="relative">
              {/* Cricket Field Circle */}
              <div className="relative w-full max-w-2xl mx-auto aspect-square">
                {/* Field background */}
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-green-900/30 to-green-950/30 border-2 border-green-700/30"></div>

                {/* Pitch in center */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-24 bg-amber-700/50"></div>

                {/* Field lines */}
                <svg className="absolute inset-0 w-full h-full">
                  {/* 30-yard circle */}
                  <circle cx="50%" cy="50%" r="30%" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" strokeDasharray="5,5" />

                  {/* Shots */}
                  {wagonWheelData.map((shot, index) => {
                    const centerX = 50;
                    const centerY = 50;
                    const angleRad = (shot.angle - 90) * (Math.PI / 180);
                    const distance = (shot.distance / 100) * 45; // Scale to fit circle
                    const endX = centerX + distance * Math.cos(angleRad);
                    const endY = centerY + distance * Math.sin(angleRad);

                    const color = shot.runs === 6 ? '#22c55e' : shot.runs === 4 ? '#3b82f6' : '#f59e0b';
                    const strokeWidth = shot.runs === 6 ? 3 : shot.runs === 4 ? 2.5 : 1.5;

                    return (
                      <g key={index}>
                        <line
                          x1={`${centerX}%`}
                          y1={`${centerY}%`}
                          x2={`${endX}%`}
                          y2={`${endY}%`}
                          stroke={color}
                          strokeWidth={strokeWidth}
                          opacity="0.8"
                        />
                        <circle
                          cx={`${endX}%`}
                          cy={`${endY}%`}
                          r={shot.runs === 6 ? 8 : shot.runs === 4 ? 6 : 4}
                          fill={color}
                          opacity="0.9"
                        />
                      </g>
                    );
                  })}
                </svg>

                {/* Direction labels */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-8 text-xs text-white/40">OFF</div>
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-8 text-xs text-white/40">LEG</div>
                <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-16 text-xs text-white/40">SQUARE LEG</div>
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-16 text-xs text-white/40">POINT</div>
              </div>

              {/* Legend */}
              <div className="mt-8 flex items-center justify-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-500"></div>
                  <span className="text-sm text-white/70">Six (6 runs)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-white/70">Four (4 runs)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-orange-500"></div>
                  <span className="text-sm text-white/70">1-3 runs</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Manhattan Graph */}
        {activeView === 'manhattan' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold mb-6">Manhattan - Runs Per Over</h2>
            <p className="text-white/60 mb-8">Track scoring progression throughout the innings</p>

            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={manhattanData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="over"
                  stroke="rgba(255,255,255,0.5)"
                  label={{ value: 'Overs', position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.5)' }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  label={{ value: 'Runs', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.5)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === 'runs') return [value, 'Runs'];
                    if (name === 'wickets') return [value, 'Wickets'];
                    return [value, name];
                  }}
                />
                <Bar dataKey="runs" fill="#e60023" radius={[8, 8, 0, 0]}>
                  {manhattanData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.wickets > 0 ? '#ff1744' : '#e60023'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/5 p-4 rounded-xl text-center">
                <p className="text-sm text-white/60 mb-1">Total Runs</p>
                <p className="text-3xl font-bold">{manhattanData.reduce((sum, over) => sum + over.runs, 0)}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-xl text-center">
                <p className="text-sm text-white/60 mb-1">Highest Over</p>
                <p className="text-3xl font-bold">{Math.max(...manhattanData.map(o => o.runs))}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-xl text-center">
                <p className="text-sm text-white/60 mb-1">Lowest Over</p>
                <p className="text-3xl font-bold">{Math.min(...manhattanData.map(o => o.runs))}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-xl text-center">
                <p className="text-sm text-white/60 mb-1">Avg/Over</p>
                <p className="text-3xl font-bold">
                  {(manhattanData.reduce((sum, over) => sum + over.runs, 0) / manhattanData.length).toFixed(1)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Run Rate Graph */}
        {activeView === 'run-rate' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold mb-6">Run Rate Comparison</h2>
            <p className="text-white/60 mb-8">Compare scoring rates between innings</p>

            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={runRateData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="over"
                  stroke="rgba(255,255,255,0.5)"
                  label={{ value: 'Overs', position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.5)' }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  label={{ value: 'Run Rate', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.5)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="teamA"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 4 }}
                  name="Team A Run Rate"
                />
                <Line
                  type="monotone"
                  dataKey="teamB"
                  stroke="#22c55e"
                  strokeWidth={3}
                  dot={{ fill: '#22c55e', r: 4 }}
                  name="Team B Run Rate"
                />
                <Line
                  type="monotone"
                  dataKey="required"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="Required Rate"
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="mt-6 flex items-center justify-center gap-8">
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-blue-500"></div>
                <span className="text-sm text-white/70">Team A Run Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-green-500"></div>
                <span className="text-sm text-white/70">Team B Run Rate</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-1 bg-orange-500 opacity-50"></div>
                <span className="text-sm text-white/70">Required Rate</span>
              </div>
            </div>
          </div>
        )}

        {/* Partnership Graph */}
        {activeView === 'partnership' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold mb-6">Partnership Analysis</h2>
            <p className="text-white/60 mb-8">Breakdown of batting partnerships</p>

            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={partnershipData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  type="number"
                  stroke="rgba(255,255,255,0.5)"
                  label={{ value: 'Runs', position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.5)' }}
                />
                <YAxis
                  type="category"
                  dataKey="partnership"
                  stroke="rgba(255,255,255,0.5)"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any, name: string, props: any) => {
                    if (name === 'runs') {
                      return [
                        `${value} runs (${props.payload.balls} balls) - ${props.payload.batsmen}`,
                        'Partnership'
                      ];
                    }
                    return [value, name];
                  }}
                />
                <Bar dataKey="runs" fill="#e60023" radius={[0, 8, 8, 0]} />
              </BarChart>
            </ResponsiveContainer>

            <div className="mt-6 space-y-3">
              {partnershipData.map((partnership, index) => (
                <div key={index} className="bg-white/5 p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{partnership.batsmen}</p>
                      <p className="text-sm text-white/60">{partnership.partnership} Wicket</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-[#e60023]">{partnership.runs} runs</p>
                      <p className="text-sm text-white/60">({partnership.balls} balls)</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bowling Heatmap */}
        {activeView === 'bowling-heatmap' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold mb-6">Bowling Heatmap - Pitch Map</h2>
            <p className="text-white/60 mb-8">Distribution of deliveries across pitch zones</p>

            {/* Pitch Grid */}
            <div className="max-w-2xl mx-auto">
              <div className="grid grid-cols-3 gap-4 mb-8">
                {/* Short length row */}
                {bowlingHeatmapData.slice(3, 6).map((zone, index) => {
                  const intensity = zone.deliveries / 45; // Normalize to max
                  const economy = zone.runs / zone.deliveries;
                  return (
                    <div
                      key={zone.zone}
                      className="aspect-square rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-transform hover:scale-105"
                      style={{
                        backgroundColor: `rgba(230, 0, 35, ${intensity * 0.8})`,
                        border: '2px solid rgba(255,255,255,0.2)'
                      }}
                    >
                      <p className="text-xs text-white/60 mb-2">Short</p>
                      <p className="text-2xl font-bold mb-1">{zone.deliveries}</p>
                      <p className="text-xs text-white/80">deliveries</p>
                      <p className="text-xs text-white/60 mt-2">{zone.runs} runs</p>
                      <p className="text-xs text-white/60">{zone.wickets} wkts</p>
                      <p className="text-xs font-semibold mt-2 text-yellow-400">
                        Econ: {economy.toFixed(1)}
                      </p>
                    </div>
                  );
                })}

                {/* Good length row */}
                {bowlingHeatmapData.slice(0, 3).map((zone) => {
                  const intensity = zone.deliveries / 45;
                  const economy = zone.runs / zone.deliveries;
                  return (
                    <div
                      key={zone.zone}
                      className="aspect-square rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-transform hover:scale-105"
                      style={{
                        backgroundColor: `rgba(230, 0, 35, ${intensity * 0.8})`,
                        border: '2px solid rgba(255,255,255,0.2)'
                      }}
                    >
                      <p className="text-xs text-white/60 mb-2">Good</p>
                      <p className="text-2xl font-bold mb-1">{zone.deliveries}</p>
                      <p className="text-xs text-white/80">deliveries</p>
                      <p className="text-xs text-white/60 mt-2">{zone.runs} runs</p>
                      <p className="text-xs text-white/60">{zone.wickets} wkts</p>
                      <p className="text-xs font-semibold mt-2 text-yellow-400">
                        Econ: {economy.toFixed(1)}
                      </p>
                    </div>
                  );
                })}

                {/* Full length row */}
                {bowlingHeatmapData.slice(6, 9).map((zone) => {
                  const intensity = zone.deliveries / 45;
                  const economy = zone.runs / zone.deliveries;
                  return (
                    <div
                      key={zone.zone}
                      className="aspect-square rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-transform hover:scale-105"
                      style={{
                        backgroundColor: `rgba(230, 0, 35, ${intensity * 0.8})`,
                        border: '2px solid rgba(255,255,255,0.2)'
                      }}
                    >
                      <p className="text-xs text-white/60 mb-2">Full</p>
                      <p className="text-2xl font-bold mb-1">{zone.deliveries}</p>
                      <p className="text-xs text-white/80">deliveries</p>
                      <p className="text-xs text-white/60 mt-2">{zone.runs} runs</p>
                      <p className="text-xs text-white/60">{zone.wickets} wkts</p>
                      <p className="text-xs font-semibold mt-2 text-yellow-400">
                        Econ: {economy.toFixed(1)}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Labels */}
              <div className="flex items-center justify-between text-sm text-white/60 mb-4">
                <span>OFF SIDE</span>
                <span>STUMPS</span>
                <span>LEG SIDE</span>
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-4 text-xs">
                <span className="text-white/60">Less deliveries</span>
                <div className="flex gap-1">
                  {[0.2, 0.4, 0.6, 0.8, 1.0].map((intensity, i) => (
                    <div
                      key={i}
                      className="w-8 h-4 rounded"
                      style={{ backgroundColor: `rgba(230, 0, 35, ${intensity * 0.8})` }}
                    />
                  ))}
                </div>
                <span className="text-white/60">More deliveries</span>
              </div>
            </div>
          </div>
        )}

        {/* Win Probability Curve */}
        {activeView === 'win-probability' && (
          <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-8 border border-white/10">
            <h2 className="text-2xl font-bold mb-6">Win Probability Curve</h2>
            <p className="text-white/60 mb-8">How win probability shifted throughout the match</p>

            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={winProbabilityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="over"
                  stroke="rgba(255,255,255,0.5)"
                  label={{ value: 'Overs', position: 'insideBottom', offset: -5, fill: 'rgba(255,255,255,0.5)' }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  label={{ value: 'Win Probability (%)', angle: -90, position: 'insideLeft', fill: 'rgba(255,255,255,0.5)' }}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0,0,0,0.9)',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: any, name: string) => [`${value}%`, name === 'teamA' ? 'Team A' : 'Team B']}
                />
                <Line
                  type="monotone"
                  dataKey="teamA"
                  stroke="#3b82f6"
                  strokeWidth={4}
                  dot={{ fill: '#3b82f6', r: 5 }}
                  name="Team A"
                />
                <Line
                  type="monotone"
                  dataKey="teamB"
                  stroke="#ef4444"
                  strokeWidth={4}
                  dot={{ fill: '#ef4444', r: 5 }}
                  name="Team B"
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="mt-6 grid grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-6 rounded-xl border border-blue-500/30">
                <p className="text-sm text-white/60 mb-2">Team A Win Probability</p>
                <p className="text-5xl font-bold text-blue-400">
                  {winProbabilityData[winProbabilityData.length - 1].teamA}%
                </p>
                <p className="text-xs text-white/40 mt-2">at end of innings</p>
              </div>
              <div className="bg-gradient-to-br from-red-500/20 to-red-600/10 p-6 rounded-xl border border-red-500/30">
                <p className="text-sm text-white/60 mb-2">Team B Win Probability</p>
                <p className="text-5xl font-bold text-red-400">
                  {winProbabilityData[winProbabilityData.length - 1].teamB}%
                </p>
                <p className="text-xs text-white/40 mt-2">at end of innings</p>
              </div>
            </div>

            <div className="mt-6 bg-white/5 p-4 rounded-xl">
              <p className="text-sm text-white/70">
                <strong>Key Moment:</strong> Over 12 saw a dramatic shift when Team B took 2 wickets,
                changing the probability from 68% (Team A) to 55% (Team B).
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
