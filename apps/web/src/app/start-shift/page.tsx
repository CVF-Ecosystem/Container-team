'use client';

import { useState, useEffect } from 'react';
import { CalendarDays, Plus, Save, Ship, Star, X } from 'lucide-react';
import { VesselList } from '@/lib/db';
import { logger } from '@/lib/logger';
import { getActiveVessels } from '@/lib/personnelService';
import EmployeeSelector from '@/components/personnel/EmployeeSelector';

const SHIFTS = ['Ca 01', 'Ca 02', 'Ca 03', 'Hành chánh', 'Ca ngày'];

const DEPARTMENTS = [
    {
        id: 'tong_hop',
        name: 'Bộ phận Tổng hợp',
        positions: ['Tổng hợp số liệu', 'Báo cáo số liệu']
    },
    {
        id: 'thu_tuc',
        name: 'Bộ phận Thủ tục',
        positions: [
            'Hành chánh', 'Trực ca', 'Trực VSL', 'Trực Hotline',
            'Tăng cường cổng', 'Nghỉ bù', 'Nghỉ phép'
        ]
    },
    {
        id: 'bai_cont',
        name: 'Bộ phận Bãi cont',
        positions: [
            'Phụ trách chung', 'Hàng nhập', 'Hàng rỗng', 'Kiểm cổng',
            'Gate In', 'Gate Out', 'CFS/Salan', 'Kế hoạch Bãi',
            'Checkpoint', 'Tăng cường C4', 'Nghỉ bù', 'Nghỉ phép'
        ]
    },
    {
        id: 'dieu_hanh',
        name: 'Bộ phận Điều hành',
        positions: ['Trực ca', 'Tăng cường bãi', 'Nghỉ bù', 'Nghỉ phép']
    }
];

type AssignmentMap = Record<string, Record<string, number[]>>;

interface TallyAssignment {
    vesselId: number;
    employeeIds: number[];
}

export default function StartShiftReportPage() {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [shift, setShift] = useState('Ca 01');
    const [activeTab, setActiveTab] = useState('tong_hop');
    const [assignments, setAssignments] = useState<AssignmentMap>({});
    const [tallyAssignments, setTallyAssignments] = useState<TallyAssignment[]>([
        { vesselId: 0, employeeIds: [] }
    ]);
    const [vessels, setVessels] = useState<VesselList[]>([]);
    const [captainId, setCaptainId] = useState<number[]>([]);
    const [viceCaptainId, setViceCaptainId] = useState<number[]>([]);
    const [yardManagerId, setYardManagerId] = useState<number[]>([]);

    useEffect(() => {
        getActiveVessels().then(setVessels);
    }, []);

    const handleAssignmentChange = (deptId: string, position: string, ids: number[]) => {
        setAssignments(prev => ({
            ...prev,
            [deptId]: { ...prev[deptId], [position]: ids }
        }));
    };

    const handleTallyChange = (index: number, field: 'vesselId' | 'employeeIds', value: number | number[]) => {
        const newTally = [...tallyAssignments];
        newTally[index] = { ...newTally[index], [field]: value };
        setTallyAssignments(newTally);
    };

    const addTallyRow = () => {
        setTallyAssignments([...tallyAssignments, { vesselId: 0, employeeIds: [] }]);
    };

    const removeTallyRow = (index: number) => {
        setTallyAssignments(tallyAssignments.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
        const report = {
            date,
            shift,
            leaders: { captain: captainId, viceCaptain: viceCaptainId, yardManager: yardManagerId },
            departments: assignments,
            tally: tallyAssignments,
            created_at: new Date()
        };
        logger.info('Submitting start shift report', report);
        alert('Đã lưu báo cáo (Demo log console)');
    };

    return (
        <div className="mx-auto max-w-6xl space-y-5 pb-10">

            {/* Session info */}
            <div className="cvf-card rounded-xl p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-muted)] mb-4 flex items-center gap-2">
                    <CalendarDays className="h-3.5 w-3.5 text-[var(--color-accent)]" aria-hidden="true" />
                    Thông tin ca
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="date-input" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
                            Ngày
                        </label>
                        <input
                            id="date-input"
                            type="date"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label htmlFor="shift-select" className="block text-xs text-[var(--color-text-secondary)] mb-1.5">
                            Ca làm việc
                        </label>
                        <select
                            id="shift-select"
                            value={shift}
                            onChange={e => setShift(e.target.value)}
                            className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
                        >
                            {SHIFTS.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Leaders */}
            <div className="cvf-card rounded-xl p-5">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-5 flex items-center gap-2">
                    <Star className="h-4 w-4 text-[var(--color-warning)]" aria-hidden="true" />
                    Ban chỉ huy
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <EmployeeSelector
                        label="Đội trưởng"
                        department="Ban chỉ huy"
                        selectedIds={captainId}
                        onChange={setCaptainId}
                        placeholder="Chọn"
                        description="chọn 1 người"
                        mode="single"
                    />
                    <EmployeeSelector
                        label="Đội phó"
                        department="Ban chỉ huy"
                        selectedIds={viceCaptainId}
                        onChange={setViceCaptainId}
                        placeholder="Chọn"
                        description="chọn 1 người"
                        mode="single"
                    />
                    <EmployeeSelector
                        label="Trưởng bãi"
                        department="Ban chỉ huy"
                        selectedIds={yardManagerId}
                        onChange={setYardManagerId}
                        placeholder="Chọn"
                        description="chọn 1 người"
                        mode="single"
                    />
                </div>
            </div>

            {/* Department tabs */}
            <div className="cvf-card rounded-xl overflow-hidden">
                <div className="flex border-b border-[var(--color-border)] overflow-x-auto">
                    {DEPARTMENTS.map(dept => (
                        <button
                            key={dept.id}
                            type="button"
                            onClick={() => setActiveTab(dept.id)}
                            className={`px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                                activeTab === dept.id
                                    ? 'border-[var(--color-accent)] text-[var(--color-accent)] bg-[var(--color-accent-dim)]'
                                    : 'border-transparent text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-elevated)]'
                            }`}
                        >
                            {dept.name}
                        </button>
                    ))}
                </div>

                <div className="p-5">
                    {DEPARTMENTS.map(dept => (
                        <div key={dept.id} className={activeTab === dept.id ? 'block' : 'hidden'}>
                            <div className="grid grid-cols-1 gap-x-6 gap-y-4 lg:grid-cols-2">
                                {dept.positions.map(pos => (
                                    <EmployeeSelector
                                        key={pos}
                                        label={pos}
                                        department={dept.name.replace('Bộ phận ', '')}
                                        shift={['Hành chánh', 'Văn phòng'].includes(pos) ? 'Hành chánh' : shift}
                                        selectedIds={assignments[dept.id]?.[pos] || []}
                                        onChange={(ids) => handleAssignmentChange(dept.id, pos, ids)}
                                    />
                                ))}
                            </div>

                            {dept.id === 'bai_cont' && (
                                <div className="mt-8 pt-6 border-t border-[var(--color-border)]">
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="text-sm font-semibold text-[var(--color-text-primary)] flex items-center gap-2">
                                            <Ship className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                                            Tally Tàu & Tác nghiệp Tàu
                                        </h3>
                                        <button
                                            type="button"
                                            onClick={addTallyRow}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--color-elevated)] hover:bg-[var(--color-accent-dim)] text-xs font-medium text-[var(--color-accent)] border border-[var(--color-border)] transition-colors"
                                        >
                                            <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                                            Thêm tàu
                                        </button>
                                    </div>

                                    <div className="space-y-3">
                                        {tallyAssignments.map((tally, idx) => (
                                            <div key={idx} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-bg)]/60 p-4">
                                                <div className="flex justify-between items-center mb-3">
                                                    <span className="text-xs font-medium text-[var(--color-text-secondary)]">Tàu #{idx + 1}</span>
                                                    {idx > 0 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => removeTallyRow(idx)}
                                                            aria-label="Xóa tàu"
                                                            className="text-[var(--color-danger)] hover:opacity-70 transition-opacity"
                                                        >
                                                            <X className="h-4 w-4" aria-hidden="true" />
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                                    <div>
                                                        <label className="block text-xs text-[var(--color-text-muted)] mb-1">Chọn Tàu</label>
                                                        <select
                                                            title="Chọn tàu"
                                                            value={tally.vesselId}
                                                            onChange={e => handleTallyChange(idx, 'vesselId', Number(e.target.value))}
                                                            className="cvf-input w-full rounded-lg px-3 py-2 text-sm"
                                                        >
                                                            <option value={0}>-- Chọn tàu --</option>
                                                            {vessels.map(v => (
                                                                <option key={v.id} value={v.id}>{v.name}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <div className="md:col-span-2">
                                                        <EmployeeSelector
                                                            label="Nhân viên Tally"
                                                            department="Bãi cont"
                                                            selectedIds={tally.employeeIds}
                                                            onChange={(ids) => handleTallyChange(idx, 'employeeIds', ids)}
                                                            placeholder="Chọn nhân viên Tally"
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end">
                <button
                    type="button"
                    onClick={handleSubmit}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--color-accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-950/30 transition-colors hover:bg-[var(--color-accent-hover)]"
                >
                    <Save className="h-4 w-4" aria-hidden="true" />
                    Lưu báo cáo đầu ca
                </button>
            </div>
        </div>
    );
}
