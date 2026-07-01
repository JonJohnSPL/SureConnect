import type { FieldRigUpContext } from "./types";

export const fieldMeterTypes = ["Coriolis", "Turbine", "Positive Displacement", "Ultrasonic"];
export const fieldEndpointTypes: FieldRigUpContext["customer"]["endpointType"][] = ["Meter", "Connection"];
export const fieldFlangeSizes = ["1.5 in", "2 in", "3 in", "4 in"];
export const fieldFlangeRatings = ["ANSI 150 RF", "ANSI 300 RF", "ANSI 600 RF", "ANSI 600 RTJ"];
export const fieldTruckTypes = ["Compact Prover (SVP)", "Bi-Directional Ball Prover", "Master Meter Skid"];
export const fieldTruckConnections = ["2 in Camlock", "3 in Hammer Union", "4 in Hammer Union"];

export const defaultFieldContext: FieldRigUpContext = {
  customer: {
    endpointType: "Meter",
    meterType: "Coriolis",
    size: "2 in",
    rating: "ANSI 150 RF",
  },
  truck: {
    type: "Compact Prover (SVP)",
    connection: "2 in Camlock",
  },
  pressure: 150,
  notes: "",
};
