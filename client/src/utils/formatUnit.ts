export function formatUnit(unit: string | null | undefined, quantity: number = 1): string {
  if (!unit) return "";
  
  const unitMappings: { [key: string]: string } = {
    'l': 'L',
    'liter': 'L', 
    'litre': 'L',
    'kg': 'KG',
    'kilogram': 'KG',
    'gram': 'Gram',
    'g': 'Gram',
    'pcs': quantity === 1 ? 'Piece' : 'Pcs',
    'piece': quantity === 1 ? 'Piece' : 'Pcs',
    'pieces': 'Pcs',
    'ml': 'ML',
    'milliliter': 'ML',
    'unit': quantity === 1 ? 'Unit' : 'Units'
  };
  
  const lowerUnit = unit.toLowerCase().trim();
  return unitMappings[lowerUnit] || unit.toUpperCase();
}