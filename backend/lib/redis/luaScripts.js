import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname manually for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Now use __dirname safely
export const lockAndSplitSeatsScript = fs.readFileSync(
  path.join(__dirname, 'lua', 'lockAndSplitSeats.lua'),
  'utf-8'
);

export const subgroupAllocationScript = fs.readFileSync(
  path.join(__dirname, "lua", "subgroupAllocation.lua"),
  "utf-8"
);

// export const lockSeatsScript = fs.readFileSync(
//   path.join(__dirname, 'lua', 'lockSeats.lua'),
//   'utf-8'
// );
