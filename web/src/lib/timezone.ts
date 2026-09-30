import { createContext, useContext } from 'react'
export const TimeZoneContext = createContext('UTC')
export function useTimeZone() { return useContext(TimeZoneContext) }
