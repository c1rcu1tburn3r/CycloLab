'use client';

import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface RoutePoint {
  lat: number;
  lng: number;
  elevation?: number;
  time: number;
  distance?: number; // Distanza progressiva in metri
}

interface ActivityElevationChartProps {
  routePoints: RoutePoint[];
  strokeColor?: string;
  fillColor?: string;
}

const ActivityElevationChart: React.FC<ActivityElevationChartProps> = ({ 
  routePoints,
  strokeColor = "#3b82f6", // Blu di default
  fillColor = "#bfdbfe" // Blu chiaro di default
}) => {
  // DEBUG: Log dei routePoints ricevuti
  // console.log('[Chart DEBUG] Raw routePoints received:', routePoints?.slice(0, 5));

  if (!routePoints || routePoints.length === 0) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md h-[300px] flex items-center justify-center">
        <p className="text-gray-500">Dati di elevazione non disponibili per il grafico.</p>
      </div>
    );
  }

  // Prepara i dati per Recharts: vogliamo { distanceKm: number, elevation: number | undefined }
  // Assicuriamoci che distance e elevation siano presenti e numerici
  const chartData = routePoints
    .filter(p => typeof p.distance === 'number' && typeof p.elevation === 'number')
    .map(p => ({
      distanceKm: parseFloat((p.distance! / 1000).toFixed(2)), // Converti distanza in km e formatta
      elevation: p.elevation,
    }));

  // DEBUG: Log dei dati preparati per il grafico e min/max calcolati
  // console.log('[Chart DEBUG] Chart data prepared:', chartData?.slice(0, 5));
  // const tempElevationValues = chartData.map(p => p.elevation).filter(e => e !== undefined) as number[];
  // console.log('[Chart DEBUG] Min/Max elevation for Y-axis (before buffer): ', Math.min(...tempElevationValues), Math.max(...tempElevationValues));

  if (chartData.length < 2) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-md h-[300px] flex items-center justify-center">
        <p className="text-gray-500">Non ci sono abbastanza dati di elevazione per visualizzare il grafico.</p>
      </div>
    );
  }
  
  // Trova il minimo e massimo dell'elevazione per impostare il dominio dell'asse Y
  // Aggiungiamo un piccolo buffer per una migliore visualizzazione
  const elevationValues = chartData.map(p => p.elevation).filter(e => e !== undefined) as number[];
  let yMin = Math.min(...elevationValues);
  let yMax = Math.max(...elevationValues);
  const yBuffer = Math.max(10, (yMax - yMin) * 0.1); // Buffer di almeno 10m o 10% del range
  yMin = Math.floor(yMin - yBuffer);
  yMax = Math.ceil(yMax + yBuffer);
  if (yMin < 0 && Math.min(...elevationValues) >=0) yMin = 0; // Evita yMin negativo se tutte le elevazioni sono positive

  return (
    <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4 text-slate-700">Profilo Altimetrico</h3>
      <div className="w-full h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{
              top: 10,
              right: 20,
              left: -20, // Riduci il margine sinistro per compattare
              bottom: 20, // Aggiungi spazio per le etichette dell'asse X
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis 
              dataKey="distanceKm"
              type="number"
              domain={['dataMin', 'dataMax']}
              tickFormatter={(km) => `${km} km`}
              stroke="#6b7280"
              fontSize={12}
              dy={10} // Sposta le etichette in basso
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              domain={[yMin, yMax]}
              dx={-5} // Sposta le etichette a sinistra
              allowDataOverflow={true}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === 'Elevazione') {
                  return [`${value.toFixed(0)} m`, name];
                }
                return [value, name];
              }}
              labelFormatter={(label: number) => `Distanza: ${label.toFixed(2)} km`}
              contentStyle={{ 
                backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                border: '1px solid #e5e7eb', 
                borderRadius: '0.5rem',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)'
              }}
              itemStyle={{ color: strokeColor }}
              cursor={{ stroke: '#9ca3af', strokeWidth: 1, strokeDasharray: '3 3' }}
            />
            <Legend verticalAlign="top" height={36} iconType="plainline" />
            <Area 
              type="monotone"
              dataKey="elevation"
              name="Elevazione"
              stroke={strokeColor}
              fill={fillColor}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 5, stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ActivityElevationChart; 