import { db, Employee, VesselList } from './db';

// Employee Functions
export async function getEmployeesByDepartment(department: string): Promise<Employee[]> {
    return await db.employees
        .where('department')
        .equals(department)
        .filter(e => e.active)
        .toArray();
}

export async function getEmployeesByDeptAndShift(department: string, shift: string): Promise<Employee[]> {
    return await db.employees
        .where('[department+shift]')
        .equals([department, shift])
        .filter(e => e.active)
        .toArray();
}

export async function getAllEmployees(): Promise<Employee[]> {
    return await db.employees.toArray();
}

export async function getUniqueDepartments(): Promise<string[]> {
    const employees = await db.employees.toArray();
    const depts = new Set(employees.map(e => e.department));
    return Array.from(depts).sort();
}

// Vessel Functions
export async function getActiveVessels(): Promise<VesselList[]> {
    return await db.vessels
        .filter(v => v.active)
        .toArray();
}

export async function addVessel(name: string): Promise<void> {
    const exists = await db.vessels.where('name').equals(name).first();
    if (!exists) {
        await db.vessels.add({
            name,
            active: true
        });
    }
}

export async function toggleVesselStatus(id: number): Promise<void> {
    const vessel = await db.vessels.get(id);
    if (vessel) {
        await db.vessels.update(id, { active: !vessel.active });
    }
}

// --- CRUD Employees ---
export async function addEmployee(emp: Omit<Employee, 'id' | 'updated_at'>): Promise<void> {
    const existing = await db.employees.where('mscd').equals(emp.mscd).first();
    if (existing) throw new Error(`Mã nhân viên ${emp.mscd} đã tồn tại!`);

    await db.employees.add({
        ...emp,
        updated_at: new Date()
    });
}

export async function updateEmployee(id: number, emp: Partial<Employee>): Promise<void> {
    await db.employees.update(id, {
        ...emp,
        updated_at: new Date()
    });
}

export async function deleteEmployees(ids: number[]): Promise<void> {
    await db.employees.bulkDelete(ids);
}

// --- CRUD Vessels ---
export async function updateVessel(id: number, name: string): Promise<void> {
    await db.vessels.update(id, { name });
}

export async function deleteVessels(ids: number[]): Promise<void> {
    await db.vessels.bulkDelete(ids);
}

export async function importVesselList(names: string[]): Promise<number> {
    let count = 0;
    await db.transaction('rw', db.vessels, async () => {
        for (const name of names) {
            const exists = await db.vessels.where('name').equals(name).first();
            if (!exists) {
                await db.vessels.add({ name, active: true });
                count++;
            }
        }
    });
    return count;
}
