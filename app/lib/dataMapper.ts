export type JSONPrimitive = string | number | boolean | null;
export type JSONValue = JSONPrimitive | JSONObject | JSONArray;
export type JSONObject = { [key: string]: JSONValue };
export type JSONArray = JSONValue[];

export interface FieldDef { name: string; type: string }

export function inferFields(payload: JSONValue): FieldDef[] {
  const fields: FieldDef[] = [];
  if (Array.isArray(payload)) {
    const first = payload.find((v) => !!v && typeof v === 'object') as JSONObject | undefined;
    if (first) Object.keys(first).forEach((k) => fields.push({ name: k, type: typeof (first as JSONObject)[k] }));
  } else if (payload && typeof payload === 'object') {
    const obj = payload as JSONObject;
    Object.keys(obj).forEach((k) => fields.push({ name: k, type: typeof obj[k] }));
  }
  return fields;
}

export function toArray(payload: JSONValue): JSONObject[] {
  if (Array.isArray(payload)) {
    return payload.filter((v) => v && typeof v === 'object') as JSONObject[];
  }
  if (payload && typeof payload === 'object') {
    return [payload as JSONObject];
  }
  // Wrap primitives into an object for display purposes
  const primitive = payload as JSONPrimitive;
  return [{ value: primitive } as unknown as JSONObject];
}

export function pickFields(rows: JSONObject[], fields: string[]): JSONObject[] {
  if (!fields?.length) return rows;
  return rows.map((row) => {
    const picked: JSONObject = {};
    for (const f of fields) picked[f] = (row as JSONObject)[f];
    return picked;
  });
}

export function normalizeToRows(payload: JSONValue, fields?: string[]): JSONObject[] {
  const rows = toArray(payload);
  return fields?.length ? pickFields(rows, fields) : rows;
}
