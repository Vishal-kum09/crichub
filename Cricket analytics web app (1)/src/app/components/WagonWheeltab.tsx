import { useEffect, useState } from 'react';
import WagonWheel, { describePoint } from '../../app/components/WagonWheel'; 
import { fetchWagonWheelData } from '../../lib/viewerApi'; 

export function WagonWheelTab({ matchId }: { matchId: string }) {
  const [shots, setShots] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!matchId) {
      setLoading(false);
      return;
    }

    fetchWagonWheelData(matchId)
      .then((data) => {
        const safeData = Array.isArray(data) ? data : [];
        const formattedShots = safeData.map((d: any) => {
          const x = Number(d.wagon_x);
          const y = Number(d.wagon_y);
          const batsmanHand = d.batting_style === 'left_hand_bat' ? 'left' : 'right';
          return {
            x,
            y,
            fieldArea: describePoint(x, y, batsmanHand).fieldArea,
            runs: Number(d.runs_batter) || 0,
            isFour: d.is_boundary_four || false,
            isSix: d.is_boundary_six || false
          };
        });
        setShots(formattedShots);
      })
      .catch((err) => {
        console.error("Wagon Wheel fetch error:", err);
        setShots([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [matchId]);

  // 🔥 NAYA LOGIC: Data ko exactly 6 categories mein baantna
  const stats = shots.reduce((acc, shot) => {
    const area = (shot.fieldArea || '').toLowerCase();
    
    // Priority 1: Specific regions match karenge
    if (area.includes('third man') || area.includes('short third Man') || area.includes('slips cordon') || area.includes('Wicket keeper')) {
      acc.thirdMan += shot.runs;
    } else if (area.includes('fine leg') || area.includes('leg slip') || area.includes('short fine leg') || area.includes('Long leg') ) {
      acc.fineLeg += shot.runs;
    } else if (area.includes('long off') || area.includes('mid off')) {
      acc.longOff += shot.runs;
    } else if (area.includes('long on') || area.includes('mid on') || area.includes('Straight hit')) {
      acc.longOn += shot.runs;
    } 
    // Priority 2: Agar upar ke 4 mein se nahi hai, toh broad sides mein daalenge
    else if (area.includes('cover') || area.includes('point')  || area.includes('extra cover')) {
      acc.offSide += shot.runs; // Bacha hua Off Side ka area
    } else {
      acc.legSide += shot.runs; // Bacha hua Leg Side ka area (Square leg, Mid wicket etc)
    }
    
    return acc;
  }, { thirdMan: 0, fineLeg: 0, longOff: 0, longOn: 0, offSide: 0, legSide: 0 });

  if (loading) {
    return <div className="p-8 text-center text-gray-500 font-medium">Loading Wagon Wheel...</div>;
  }

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
      
      <div className="space-y-4">
        <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">🎯 Radial Shot Distribution Wheel</h3>
        <p className="text-sm text-gray-500">Interactive zone allocation vector showing where runs have been compiled across the field boundary coordinates.</p>
        
        {/* 🔥 NAYA UI: 6 Boxes grid */}
        <div className="grid grid-cols-2 gap-3 text-xs font-bold text-gray-700">
          
          <div className="p-3 bg-purple-50 border border-purple-100 rounded-xl flex justify-between">
            <span>Third Man:</span><span className="text-purple-600">{stats.thirdMan} Runs</span>
          </div>
          
          <div className="p-3 bg-yellow-50 border border-yellow-100 rounded-xl flex justify-between">
            <span>Fine Leg:</span><span className="text-yellow-600">{stats.fineLeg} Runs</span>
          </div>
          
          <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl flex justify-between">
            <span>Long Off:</span><span className="text-blue-600">{stats.longOff} Runs</span>
          </div>
          
          <div className="p-3 bg-green-50 border border-green-100 rounded-xl flex justify-between">
            <span>Long On:</span><span className="text-green-600">{stats.longOn} Runs</span>
          </div>
          
          <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex justify-between">
            <span>Off Side:</span><span className="text-red-600">{stats.offSide} Runs</span>
          </div>
          
          <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl flex justify-between">
            <span>Leg Side:</span><span className="text-orange-600">{stats.legSide} Runs</span>
          </div>
          
        </div>
      </div>

      <div className="flex justify-center">
        <div className="relative w-64 h-64 md:w-72 md:h-72 pointer-events-none">
          <WagonWheel
            batsmanHand="right" 
            selectedShots={shots as any} 
            onPointSelect={() => {}} 
            stadiumEnd="Pavilion End"
            savePoint={async () => {}}
          />
        </div>
      </div>
      
    </div>
  );
}
