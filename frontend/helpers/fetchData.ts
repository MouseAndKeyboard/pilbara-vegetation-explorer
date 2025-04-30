// helpers/fetchData.ts
import { supabase } from "@/lib/supabaseClient"

export async function fetchTimeSeriesForMonth(targetMonth: number, targetYear: number) {
  const monthString = (targetMonth + 1).toString().padStart(2, "0")
  const yearMonth = `${targetYear}-${monthString}`

  const { data, error } = await supabase
  .from("vegetation_timeseries")
  .select(`
    id, date, ndvi, type,
    vegetation_points (
      id, name, confidence,
      geom
    )
  `)
  .eq("month", yearMonth);


  if (error) {
    console.error("Error fetching timeseries from Supabase:", error)
    return []
  }

  return data
}
