'use client';

import { useState, useRef, useEffect } from 'react';
import ExcelParser from '@/components/dashboard/ExcelParser';
import DbStatusCard from '@/components/dashboard/DbStatusCard';
import { DashboardData } from '@/types';
import { useDbStatus, useAvailableYears, useSyncStatus, useSyncQueue } from '@/lib/hooks';
import { logger } from '@/lib/logger';
import { clearYearData } from '@/lib/dataService';
import { db } from '@/lib/db';

import {
    downloadJSONBackup,
    downloadExcelBackup,
    importFromJSON,
    importFromExcel,
    isAutoBackupEnabled,
    setAutoBackupEnabled,
    getAutoBackupStatus,
    runAutoBackupIfDue,
    isFileSystemAccessSupported,
    getSavedBackupFolderName,
    pickBackupFolder,
    clearBackupFolder
} from '@/lib/backupService';
import {
    AlertTriangle,
    CheckCircle,
    Database,
    Download,
    FileJson,
    FileSpreadsheet,
    FolderOpen,
    Info,
    Package,
    RefreshCw,
    Ship,
    Trash2,
    Upload,
    WifiOff,
    X,
} from 'lucide-react';
import { syncAll, clearSyncQueue } from '@/lib/syncService';

export default function AdminDataPage() {
    useDbStatus();
    const availableYears = useAvailableYears();
    const syncStatus = useSyncStatus();
    const syncQueue = useSyncQueue() ?? [];
    const [isSyncRetrying, setIsSyncRetrying] = useState(false);
    const [isClearingQueue, setIsClearingQueue] = useState(false);
    const [clearingYear, setClearingYear] = useState<number | null>(null);
    const [vesselCount, setVesselCount] = useState<number | null>(null);
    const [isClearingVessels, setIsClearingVessels] = useState(false);
    const [snapshotCount, setSnapshotCount] = useState<number | null>(null);
    const [isClearingSnapshots, setIsClearingSnapshots] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const jsonInputRef = useRef<HTMLInputElement>(null);
    const excelInputRef = useRef<HTMLInputElement>(null);

    const [autoBackupEnabled, setAutoBackupState] = useState(false);
    const [autoBackupStatus, setAutoBackupStatusState] = useState<ReturnType<typeof getAutoBackupStatus> | null>(null);

    useEffect(() => {
        setAutoBackupState(isAutoBackupEnabled());
        setAutoBackupStatusState(getAutoBackupStatus());
        const checkAutoBackup = async () => {
            const wasBackedUp = await runAutoBackupIfDue();
            if (wasBackedUp) setAutoBackupStatusState(getAutoBackupStatus());
        };
        checkAutoBackup();
    }, []);

    const handleToggleAutoBackup = () => {
        const newValue = !autoBackupEnabled;
        setAutoBackupEnabled(newValue);
        setAutoBackupState(newValue);
        setAutoBackupStatusState(getAutoBackupStatus());
    };

    const [exportYears, setExportYears] = useState<number[]>([]);
    const [exportMode, setExportMode] = useState<'all' | 'selected'>('all');
    const [backupFolderName, setBackupFolderName] = useState<string | null>(null);
    const [folderSupported, setFolderSupported] = useState(false);

    useEffect(() => {
        setFolderSupported(isFileSystemAccessSupported());
        setBackupFolderName(getSavedBackupFolderName());
    }, []);

    const handlePickFolder = async () => {
        const result = await pickBackupFolder();
        if (result.success && result.folderName) {
            setBackupFolderName(result.folderName);
        } else if (result.error) {
            alert(result.error);
        }
    };

    const handleClearFolder = () => {
        clearBackupFolder();
        setBackupFolderName(null);
    };

    const toggleExportYear = (year: number) => {
        setExportYears(prev =>
            prev.includes(year) ? prev.filter(y => y !== year) : [...prev, year].sort()
        );
    };

    const getExportOptions = () => {
        if (exportMode === 'all' || exportYears.length === 0) return undefined;
        return { years: exportYears };
    };

    const handleExportJSON = async () => {
        setIsExporting(true);
        try {
            await downloadJSONBackup(getExportOptions());
        } catch {
            alert('Lỗi export JSON');
        } finally {
            setIsExporting(false);
        }
    };

    const handleExportExcel = async () => {
        setIsExporting(true);
        try {
            await downloadExcelBackup(getExportOptions());
        } catch {
            alert('Lỗi export Excel');
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!confirm('Import sẽ thay thế toàn bộ dữ liệu hiện tại. Tiếp tục?')) {
            e.target.value = '';
            return;
        }
        setIsImporting(true);
        setImportMessage(null);
        try {
            const text = await file.text();
            const result = await importFromJSON(text);
            setImportMessage({ type: result.success ? 'success' : 'error', text: result.message });
        } catch {
            setImportMessage({ type: 'error', text: 'Lỗi đọc file' });
        } finally {
            setIsImporting(false);
            e.target.value = '';
        }
    };

    const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!confirm('Import sẽ thay thế toàn bộ dữ liệu hiện tại. Tiếp tục?')) {
            e.target.value = '';
            return;
        }
        setIsImporting(true);
        setImportMessage(null);
        try {
            const result = await importFromExcel(file);
            setImportMessage({ type: result.success ? 'success' : 'error', text: result.message });
        } catch {
            setImportMessage({ type: 'error', text: 'Lỗi đọc file' });
        } finally {
            setIsImporting(false);
            e.target.value = '';
        }
    };

    const handleDataLoaded = (data: DashboardData[], dataType: 'daily' | 'monthly') => {
        logger.info('Admin data import loaded records', { count: data.length, dataType });
    };

    const handleRetrySync = async () => {
        setIsSyncRetrying(true);
        try {
            await syncAll();
        } finally {
            setIsSyncRetrying(false);
        }
    };

    const handleClearQueue = async () => {
        if (!confirm('Xóa toàn bộ hàng chờ đồng bộ? Dữ liệu chưa sync lên server sẽ bị mất.')) return;
        setIsClearingQueue(true);
        try {
            await clearSyncQueue();
        } finally {
            setIsClearingQueue(false);
        }
    };

    const handleClearYear = async (year: number) => {
        if (!confirm(`Xóa tất cả dữ liệu năm ${year}?`)) return;
        setClearingYear(year);
        try {
            await clearYearData(year);
            alert(`Đã xóa dữ liệu năm ${year}`);
        } catch (error) {
            console.error('Error clearing year:', error);
            alert('Lỗi xóa dữ liệu');
        } finally {
            setClearingYear(null);
        }
    };

    const loadVesselCount = async () => {
        const count = await db.vessel_data.count();
        setVesselCount(count);
    };

    const loadSnapshotCount = async () => {
        const count = await db.inventory_snapshots.count();
        setSnapshotCount(count);
    };

    useEffect(() => { void loadVesselCount(); void loadSnapshotCount(); }, []);

    const handleClearSnapshotData = async () => {
        const count = await db.inventory_snapshots.count();
        if (!confirm(`Xóa toàn bộ ${count} bản ghi tồn bãi? Thao tác này không thể hoàn tác.`)) return;
        setIsClearingSnapshots(true);
        try {
            await db.inventory_snapshots.clear();
            await loadSnapshotCount();
        } catch (error) {
            console.error('Error clearing snapshot data:', error);
            alert('Lỗi xóa dữ liệu tồn bãi');
        } finally {
            setIsClearingSnapshots(false);
        }
    };

    const handleClearVesselData = async () => {
        const count = await db.vessel_data.count();
        if (!confirm(`Xóa toàn bộ ${count} bản ghi dữ liệu tàu? Thao tác này không thể hoàn tác.`)) return;
        setIsClearingVessels(true);
        try {
            await db.vessel_data.clear();
            await db.vessels.clear();
            await loadVesselCount();
            alert('Đã xóa toàn bộ dữ liệu tàu và danh sách tàu.');
        } catch (error) {
            console.error('Error clearing vessel data:', error);
            alert('Lỗi xóa dữ liệu tàu');
        } finally {
            setIsClearingVessels(false);
        }
    };

    return (
        <div className="space-y-6">

            {/* Sync Queue Monitor */}
            <div className="cvf-card rounded-xl p-6">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                    Trạng thái
                </h2>

                {/* Status row */}
                <div className="flex flex-wrap items-center gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm">
                        {syncStatus.isOnline ? (
                            <><span className="h-2 w-2 rounded-full bg-green-400" /><span className="text-green-400">Online</span></>
                        ) : (
                            <><WifiOff className="h-3.5 w-3.5 text-yellow-400" aria-hidden="true" /><span className="text-yellow-400">Offline</span></>
                        )}
                    </div>
                    <div className="text-sm text-[var(--color-text-secondary)]">
                        Chờ sync: <span className={syncStatus.pendingChanges > 0 ? 'text-yellow-400 font-semibold' : 'text-[var(--color-text-primary)]'}>{syncStatus.pendingChanges}</span>
                    </div>
                    {syncStatus.lastSyncAt && (
                        <div className="text-xs text-[var(--color-text-muted)]">
                            Lần cuối: {syncStatus.lastSyncAt.toLocaleString('vi-VN')}
                        </div>
                    )}
                    <div className="ml-auto flex gap-2">
                        <button
                            type="button"
                            onClick={handleRetrySync}
                            disabled={isSyncRetrying || syncStatus.isSyncing || !syncStatus.isOnline}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors bg-[var(--color-accent)]/10 text-[var(--color-accent)] hover:bg-[var(--color-accent)]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <RefreshCw className={`h-3 w-3 ${(isSyncRetrying || syncStatus.isSyncing) ? 'animate-spin' : ''}`} aria-hidden="true" />
                            {syncStatus.isSyncing ? 'Đang sync...' : 'Retry Now'}
                        </button>
                        {syncQueue.length > 0 && (
                            <button
                                type="button"
                                onClick={handleClearQueue}
                                disabled={isClearingQueue}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <Trash2 className="h-3 w-3" aria-hidden="true" />
                                Xóa hàng chờ
                            </button>
                        )}
                    </div>
                </div>

                {/* Pending queue table */}
                {syncQueue.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead>
                                <tr className="border-b border-[var(--color-border)] text-left text-[var(--color-text-muted)]">
                                    <th className="pb-2 pr-4 font-medium">Bảng</th>
                                    <th className="pb-2 pr-4 font-medium">Thao tác</th>
                                    <th className="pb-2 pr-4 font-medium">Thời gian</th>
                                    <th className="pb-2 font-medium">Retry</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--color-border)]">
                                {syncQueue.map((item) => (
                                    <tr key={item.id} className="text-[var(--color-text-secondary)]">
                                        <td className="py-2 pr-4 font-mono text-[var(--color-text-primary)]">{item.table_name}</td>
                                        <td className="py-2 pr-4">
                                            <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                                item.operation === 'insert' ? 'bg-green-500/10 text-green-400' :
                                                item.operation === 'delete' ? 'bg-red-500/10 text-red-400' :
                                                'bg-blue-500/10 text-blue-400'
                                            }`}>{item.operation.toUpperCase()}</span>
                                        </td>
                                        <td className="py-2 pr-4">{new Date(item.timestamp).toLocaleString('vi-VN')}</td>
                                        <td className="py-2">
                                            {item.retry_count > 0 ? (
                                                <span className="text-[var(--color-warning)]">{item.retry_count}×</span>
                                            ) : (
                                                <CheckCircle className="h-3.5 w-3.5 text-[var(--color-text-muted)]" aria-hidden="true" />
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-sm text-[var(--color-text-muted)] flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-400" aria-hidden="true" />
                        Không có thay đổi nào đang chờ đồng bộ.
                    </p>
                )}
            </div>

            {/* Upload Section */}
            <div className="cvf-card rounded-xl p-6">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                    <Upload className="h-4 w-4 text-[var(--color-accent)]" aria-hidden="true" />
                    Upload
                </h2>
                <p className="text-sm text-[var(--color-text-secondary)] mb-3">
                    Chọn file Excel để import dữ liệu vào hệ thống. Hỗ trợ:
                </p>
                <ul className="text-sm text-[var(--color-text-muted)] mb-4 space-y-1 list-disc list-inside">
                    <li><span className="text-[var(--color-text-secondary)]">So lieu ngay_thang.xlsx</span> — Dữ liệu biến động theo ngày</li>
                    <li><span className="text-[var(--color-text-secondary)]">So lieu luy tien.xlsx</span> — Dữ liệu lũy tiến theo tháng/năm</li>
                </ul>
                <ExcelParser onDataLoaded={handleDataLoaded} onClearData={() => { }} />
            </div>

            {/* Database Status */}
            <div className="cvf-card rounded-xl p-6">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                    <Database className="h-4 w-4 text-[var(--color-info)]" aria-hidden="true" />
                    Database
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <DbStatusCard />
                    <div className="bg-[var(--color-elevated)]/40 rounded-lg p-4 border border-[var(--color-border)]">
                        <h3 className="text-xs font-medium text-[var(--color-text-secondary)] mb-3">Quản lý theo năm</h3>
                        {availableYears && availableYears.length > 0 ? (
                            <div className="space-y-2">
                                {availableYears.map(year => (
                                    <div key={year} className="flex items-center justify-between p-2.5 bg-[var(--color-bg)]/60 rounded-lg border border-[var(--color-border)]">
                                        <span className="text-sm font-medium text-[var(--color-text-primary)]">{year}</span>
                                        <button
                                            type="button"
                                            onClick={() => handleClearYear(year)}
                                            disabled={clearingYear === year}
                                            className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-lg transition-colors bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {clearingYear === year
                                                ? <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                                                : <Trash2 className="h-3 w-3" aria-hidden="true" />
                                            }
                                            Xóa
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-[var(--color-text-muted)]">Chưa có dữ liệu</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Backup & Restore */}
            <div className="cvf-card rounded-xl p-6">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                    <Download className="h-4 w-4 text-[var(--color-success)]" aria-hidden="true" />
                    Sao lưu & Phục hồi
                </h2>

                {importMessage && (
                    <div className={`mb-4 rounded-lg px-4 py-3 text-sm border ${
                        importMessage.type === 'success'
                            ? 'bg-[var(--color-success)]/10 border-[var(--color-success)]/30 text-[var(--color-success)]'
                            : 'bg-[var(--color-danger)]/10 border-[var(--color-danger)]/30 text-[var(--color-danger)]'
                    }`}>
                        {importMessage.text}
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Export */}
                    <div className="bg-[var(--color-elevated)]/40 rounded-lg p-4 border border-[var(--color-border)]">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] mb-3">Export Database</h3>

                        <div className="flex gap-2 mb-3">
                            <button
                                type="button"
                                onClick={() => setExportMode('all')}
                                className={`flex-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                    exportMode === 'all'
                                        ? 'bg-[var(--color-accent)] text-white'
                                        : 'bg-[var(--color-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                                }`}
                            >
                                Tất cả
                            </button>
                            <button
                                type="button"
                                onClick={() => setExportMode('selected')}
                                className={`flex-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                    exportMode === 'selected'
                                        ? 'bg-[var(--color-accent)] text-white'
                                        : 'bg-[var(--color-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                                }`}
                            >
                                Chọn năm
                            </button>
                        </div>

                        {exportMode === 'selected' && availableYears && availableYears.length > 0 && (
                            <div className="mb-3 flex flex-wrap gap-2">
                                {availableYears.map(year => (
                                    <button
                                        key={year}
                                        type="button"
                                        onClick={() => toggleExportYear(year)}
                                        className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                                            exportYears.includes(year)
                                                ? 'bg-[var(--color-warning)]/20 text-[var(--color-warning)] border border-[var(--color-warning)]/30'
                                                : 'bg-[var(--color-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                                        }`}
                                    >
                                        {year}
                                    </button>
                                ))}
                            </div>
                        )}

                        {exportMode === 'selected' && exportYears.length > 0 && (
                            <p className="text-xs text-[var(--color-warning)] mb-2">
                                Sẽ export: {exportYears.join(', ')}
                            </p>
                        )}

                        <div className="flex flex-col gap-2">
                            <button
                                type="button"
                                onClick={handleExportJSON}
                                disabled={isExporting || (exportMode === 'selected' && exportYears.length === 0)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors bg-[var(--color-accent)] hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <FileJson className="h-4 w-4" aria-hidden="true" />
                                {isExporting ? 'Đang xuất...' : 'Export JSON'}
                            </button>
                            <button
                                type="button"
                                onClick={handleExportExcel}
                                disabled={isExporting || (exportMode === 'selected' && exportYears.length === 0)}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors bg-[var(--color-success)] hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                                {isExporting ? 'Đang xuất...' : 'Export Excel'}
                            </button>
                        </div>

                        {folderSupported && (
                            <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                                <div className="flex items-center justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs text-[var(--color-text-muted)]">Lưu vào: </span>
                                        <span className="text-xs text-[var(--color-text-secondary)] truncate">
                                            {backupFolderName || 'Downloads (mặc định)'}
                                        </span>
                                    </div>
                                    <div className="flex gap-1">
                                        <button
                                            type="button"
                                            onClick={handlePickFolder}
                                            className="flex items-center gap-1 px-2 py-1 rounded text-xs bg-[var(--color-elevated)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                                        >
                                            <FolderOpen className="h-3 w-3" aria-hidden="true" />
                                            Chọn
                                        </button>
                                        {backupFolderName && (
                                            <button
                                                type="button"
                                                onClick={handleClearFolder}
                                                title="Xóa folder đã chọn"
                                                aria-label="Xóa folder đã chọn"
                                                className="p-1 rounded text-xs bg-[var(--color-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                                            >
                                                <X className="h-3 w-3" aria-hidden="true" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}

                        <p className="text-xs text-[var(--color-text-muted)] mt-2">
                            JSON: Full backup, phục hồi chính xác<br />
                            Excel: Dễ đọc, chỉnh sửa được
                        </p>
                    </div>

                    {/* Import */}
                    <div className="bg-[var(--color-elevated)]/40 rounded-lg p-4 border border-[var(--color-border)]">
                        <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--color-text-secondary)] mb-3">Import Database</h3>
                        <div className="flex flex-col gap-2">
                            <input type="file" ref={jsonInputRef} accept=".json" onChange={handleImportJSON} aria-label="Chọn file JSON để import" className="hidden" />
                            <button
                                type="button"
                                onClick={() => jsonInputRef.current?.click()}
                                disabled={isImporting}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors bg-[var(--color-warning)]/80 hover:bg-[var(--color-warning)] disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <FileJson className="h-4 w-4" aria-hidden="true" />
                                {isImporting ? 'Đang nhập...' : 'Import từ JSON'}
                            </button>
                            <input type="file" ref={excelInputRef} accept=".xlsx,.xls" onChange={handleImportExcel} aria-label="Chọn file Excel để import" className="hidden" />
                            <button
                                type="button"
                                onClick={() => excelInputRef.current?.click()}
                                disabled={isImporting}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors bg-[var(--color-info)] hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                                <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
                                {isImporting ? 'Đang nhập...' : 'Import từ Excel'}
                            </button>
                        </div>
                        <div className="mt-3 flex items-start gap-1.5 text-xs text-[var(--color-warning)]">
                            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden="true" />
                            Import sẽ thay thế toàn bộ dữ liệu hiện tại
                        </div>
                    </div>
                </div>

                {/* Auto Backup */}
                <div className="mt-6 pt-6 border-t border-[var(--color-border)]">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2">
                                <RefreshCw className="h-3.5 w-3.5 text-[var(--color-text-muted)]" aria-hidden="true" />
                                Auto Backup
                            </h3>
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                                Tự động backup JSON mỗi 7 ngày khi mở Admin page
                            </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                checked={autoBackupEnabled}
                                onChange={handleToggleAutoBackup}
                                aria-label="Bật/tắt Auto Backup"
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-[var(--color-elevated)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-success)]" />
                        </label>
                    </div>

                    {autoBackupEnabled && autoBackupStatus && (
                        <div className="mt-3 p-3 bg-[var(--color-elevated)]/40 rounded-lg border border-[var(--color-border)] text-xs">
                            <div className="flex justify-between text-[var(--color-text-secondary)] mb-1">
                                <span>Lần backup cuối:</span>
                                <span className="text-[var(--color-text-primary)]">
                                    {autoBackupStatus.lastBackup
                                        ? autoBackupStatus.lastBackup.toLocaleString('vi-VN')
                                        : 'Chưa có'}
                                </span>
                            </div>
                            <div className="flex justify-between text-[var(--color-text-secondary)]">
                                <span>Backup tiếp theo:</span>
                                <span className={autoBackupStatus.isDue ? 'text-[var(--color-warning)]' : 'text-[var(--color-text-primary)]'}>
                                    {autoBackupStatus.nextBackup
                                        ? autoBackupStatus.nextBackup.toLocaleString('vi-VN')
                                        : 'Ngay khi tải trang'}
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Vessel Data Management */}
            <div className="cvf-card rounded-xl p-6">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                    <Ship className="h-4 w-4 text-[var(--color-warning)]" aria-hidden="true" />
                    Dữ liệu tàu 
                </h2>
                <div className="flex items-center justify-between p-4 bg-[var(--color-elevated)]/40 rounded-lg border border-[var(--color-border)]">
                    <div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                            Vessel_data
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            {vesselCount === null ? 'Đang đếm...' : `${vesselCount} bản ghi`}
                            {' — '}import file Báo cáo tàu
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClearVesselData}
                        disabled={isClearingVessels || vesselCount === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isClearingVessels
                            ? <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                            : <Trash2 className="h-3 w-3" aria-hidden="true" />
                        }
                        Xóa toàn bộ
                    </button>
                </div>
            </div>

            {/* Inventory Snapshot Management */}
            <div className="cvf-card rounded-xl p-6">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                    <Package className="h-4 w-4 text-[var(--color-info)]" aria-hidden="true" />
                    Tồn bãi 
                </h2>
                <div className="flex items-center justify-between p-4 bg-[var(--color-elevated)]/40 rounded-lg border border-[var(--color-border)]">
                    <div>
                        <p className="text-sm font-medium text-[var(--color-text-primary)]">
                            Inventory_daily data
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)] mt-0.5">
                            {snapshotCount === null ? 'Đang đếm...' : `${snapshotCount} bản ghi`}
                            {' — '}import file Tồn bãi container
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={handleClearSnapshotData}
                        disabled={isClearingSnapshots || snapshotCount === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {isClearingSnapshots
                            ? <RefreshCw className="h-3 w-3 animate-spin" aria-hidden="true" />
                            : <Trash2 className="h-3 w-3" aria-hidden="true" />
                        }
                        Xóa toàn bộ
                    </button>
                </div>
            </div>

            {/* Instructions */}
            <div className="cvf-card rounded-xl p-6">
                <h2 className="text-sm font-semibold text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
                    <Info className="h-4 w-4 text-[var(--color-text-muted)]" aria-hidden="true" />
                    Hướng dẫn sử dụng
                </h2>
                <div className="space-y-4 text-sm">
                    {[
                        {
                            title: '1. Upload dữ liệu mới',
                            body: 'Click "Upload Excel" và chọn file.',
                        },
                        {
                            title: '2. Sao lưu dữ liệu',
                            body: 'Dùng Export JSON để backup toàn bộ. Export Excel cho phép xem và chỉnh sửa dữ liệu.',
                        },
                        {
                            title: '3. Phục hồi dữ liệu',
                            body: 'Import từ file JSON hoặc Excel backup. Lưu ý: Dữ liệu hiện tại sẽ bị thay thế.',
                        },
                    ].map(({ title, body }) => (
                        <div key={title}>
                            <h3 className="font-medium text-[var(--color-text-primary)] mb-0.5">{title}</h3>
                            <p className="text-[var(--color-text-secondary)]">{body}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
