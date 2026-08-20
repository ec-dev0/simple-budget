import { createBudget, createCategory, createItem, listBudgets } from "./repo.ts";

const existing = listBudgets();
if (existing.length > 0) {
  console.log("[seed] La base de datos ya contiene datos; no se añade el demo.");
  process.exit(0);
}

// DATOS DE DEMOSTRACIÓN SINTÉTICOS
console.log("[seed] Creando presupuesto de demostración 'Casa'...");

const casa = createBudget({
  name: "Casa",
  description: "Presupuesto para equipar la nueva vivienda (demo)",
  initialAmount: 15000,
  currency: "EUR",
  color: "#6366f1",
  icon: "home",
});

const cocina = createCategory(casa.id, {
  name: "Cocina",
  description: "Electrodomésticos y menaje",
  icon: "chef-hat",
  color: "#f59e0b",
  limitAmount: 4000,
});

const salon = createCategory(casa.id, {
  name: "Salón",
  description: "Mobiliario y decoración",
  icon: "sofa",
  color: "#10b981",
  limitAmount: 3500,
});

const dormitorio = createCategory(casa.id, {
  name: "Dormitorio",
  description: "Colchón, ropa de cama y armario",
  icon: "bed-double",
  color: "#8b5cf6",
  limitAmount: 2500,
});

const obra = createCategory(casa.id, {
  name: "Pequeñas obras",
  description: "Pintura, instalación y reparaciones",
  icon: "hammer",
  color: "#ef4444",
});

createItem(cocina.id, {
  name: "Placa de inducción",
  description: "De 60 cm, cuatro fuegos",
  quantity: 1,
  unit: "uds",
  estimatedCost: 549,
  actualCost: 529,
  purchased: true,
  priority: 3,
  store: "Media Markt",
  notes: "Modelo Beko 60T",
});
createItem(cocina.id, {
  name: "Horno",
  estimatedCost: 420,
  priority: 3,
  store: "Leroy Merlin",
});
createItem(cocina.id, {
  name: "Sartenes (juego 3)",
  quantity: 1,
  unit: "juego",
  estimatedCost: 90,
  priority: 2,
});
createItem(cocina.id, {
  name: "Batidora de varillas",
  estimatedCost: 45,
  priority: 1,
});
createItem(cocina.id, {
  name: "Cubertería (12 servicios)",
  estimatedCost: 75,
  actualCost: 82,
  purchased: true,
  priority: 2,
});

createItem(salon.id, {
  name: "Sofá de tres plazas",
  estimatedCost: 1200,
  priority: 3,
  dueDate: "2026-10-01",
});
createItem(salon.id, {
  name: "Lámpara de pie",
  estimatedCost: 120,
  priority: 2,
});
createItem(salon.id, {
  name: "Mesa de centro",
  estimatedCost: 350,
  actualCost: 380,
  purchased: true,
  priority: 2,
});

createItem(dormitorio.id, {
  name: "Colchón viscoelástico 160x200",
  estimatedCost: 480,
  priority: 3,
});
createItem(dormitorio.id, {
  name: "Canapé con almacenaje",
  estimatedCost: 650,
  priority: 3,
});
createItem(dormitorio.id, {
  name: "Ropa de cama (nórdico + 2 sábanas)",
  estimatedCost: 95,
  priority: 2,
});

createItem(obra.id, {
  name: "Pintura interior (blanca mate)",
  quantity: 20,
  unit: "l",
  estimatedCost: 180,
  priority: 2,
});
createItem(obra.id, {
  name: "Fijaciones y tacos (surtido)",
  estimatedCost: 25,
  priority: 1,
});

console.log(`[seed] Listo. Presupuesto '${casa.name}' (${casa.currency}) con 4 categorías.`);
console.log("[seed] Los datos son sintéticos y puedes borrarlos desde la interfaz.");
