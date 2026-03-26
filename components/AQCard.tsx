// /components/AQCard.tsx
type AQCardProps = {
    station_name: string;
    aqi: number;
    date: string;
  };
  
  export default function AQCard({ station_name, aqi, date }: AQCardProps) {
    const getColor = (aqi: number) => {
      if (aqi <= 50) return 'green';
      if (aqi <= 100) return 'yellow';
      if (aqi <= 150) return 'orange';
      if (aqi <= 200) return 'red';
      if (aqi <= 300) return 'purple';
      return 'maroon';
    };
  
    return (
      <div className={`bg-${getColor(aqi)}-200 p-4 rounded shadow`}>
        <h2 className="font-bold text-lg">{station_name}</h2>
        <p className="text-2xl">{aqi}</p>
        <p className="text-sm text-gray-700">{new Date(date).toLocaleDateString()}</p>
      </div>
    );
  }