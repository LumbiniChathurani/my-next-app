// /components/AQCard.tsx
type AQCardProps = {
  station_name: string;
  aqi: number;
  date: string;
};

export default function AQCard({ station_name, aqi, date }: AQCardProps) {

  const getColorClass = (aqi: number) => {
    if (aqi <= 50) return 'bg-green-600';
    if (aqi <= 100) return 'bg-yellow-400';
    if (aqi <= 150) return 'bg-orange-200';
    if (aqi <= 200) return 'bg-red-200';
    if (aqi <= 300) return 'bg-purple-200';
    return 'bg-red-900';
  };

  return (
    <div className={`${getColorClass(aqi)} p-4 rounded shadow`}>
      <h2 className="font-bold text-lg">{station_name}</h2>
      <p className="text-2xl">{aqi}</p>
      <p className="text-sm text-gray-700">
        {new Date(date).toLocaleDateString()}
      </p>
    </div>
  );
}