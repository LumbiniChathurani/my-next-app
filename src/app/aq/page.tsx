type AQIResponse = {
    data: {
      current: {
        pollution: {
          aqius: number
        }
      }
    }
  }
  
  async function getAQI(): Promise<number> {
    const res = await fetch(
      `https://api.airvisual.com/v2/city?city=Colombo&state=Western&country=Sri Lanka&key=feeb71ce-6159-4721-829e-4fe6a162a4a7`,
      { cache: "no-store" } // always get fresh data
    )
  
    const data: AQIResponse = await res.json()
    return data.data.current.pollution.aqius
  }
  
  export default async function AQPage() {
    const aqi = await getAQI()
  
    return (
      <div>
        <h1>Colombo AQI</h1>
        <p>AQI: {aqi}</p>
      </div>
    )
  }