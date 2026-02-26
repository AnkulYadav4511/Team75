import React, { useEffect, useState } from 'react';
import {
    View, Text, FlatList, StyleSheet,
    ActivityIndicator, RefreshControl, TouchableOpacity, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as FileSystem from 'expo-file-system/legacy'; 
import * as Sharing from 'expo-sharing';
import { authService, BASE_URL as API_URL } from '../../services/api';

export default function WorkerShifts() {
    const { userId, name } = useLocalSearchParams();
    const router = useRouter();

    const [shifts, setShifts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchUserHistory();
    }, [userId]);

    const fetchUserHistory = async () => {
        try {
            const data = await authService.getHistory(userId as string);
            setShifts(data);
        } catch (e) {
            console.error("History Fetch Error:", e);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const downloadReport = async (shiftId: string, date: string) => {
        try {
            // 1. Clean filename
            const cleanDate = date.replace(/\//g, '-');
            const fileUri = `${FileSystem.documentDirectory}Report_${cleanDate}.csv`;

            // 2. Build the full URL
            // Ensure API_URL doesn't end with / because we add it here
            const downloadUrl = `${API_URL}/download-shift-report/${shiftId}`;
            console.log("Downloading from:", downloadUrl);

            // 3. Create the downloader
            const downloadResumable = FileSystem.createDownloadResumable(
                downloadUrl,
                fileUri
            );

            const result = await downloadResumable.downloadAsync();

            if (!result || result.status !== 200) {
                // If backend returns 404/500, it counts as a failure here
                Alert.alert("Error", "Server failed to generate the CSV. Check backend logs.");
                return;
            }

            // 4. Trigger Native Share UI
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(result.uri, {
                    mimeType: 'text/csv',
                    dialogTitle: `Download Report for ${date}`,
                    UTI: 'public.comma-separated-values-text', // for iOS
                });
            } else {
                Alert.alert("Saved", `File saved to: ${result.uri}`);
            }
        } catch (error) {
            console.error("Download Logic Error:", error);
            Alert.alert("Download Failed", "Something went wrong on the device. Check console.");
        }
    };

    const renderShiftCard = ({ item }: any) => {
        const isOngoing = item.logoutTime === 'Ongoing' || !item.logoutTime;

        return (
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <Text style={styles.dateText}>{item.date}</Text>
                    <View style={[styles.statusBadge, isOngoing ? styles.ongoingBg : styles.completedBg]}>
                        <View style={[styles.dot, isOngoing ? styles.ongoingDot : styles.completedDot]} />
                        <Text style={[styles.statusText, isOngoing ? styles.ongoingColor : styles.completedColor]}>
                            {isOngoing ? 'ONGOING' : 'COMPLETED'}
                        </Text>
                    </View>
                </View>

                <View style={styles.timeRow}>
                    <View style={styles.timeBlock}>
                        <Ionicons name="log-in-outline" size={16} color="#8E8E93" />
                        <Text style={styles.timeLabel}> Login: <Text style={styles.timeValue}>{item.loginTime}</Text></Text>
                    </View>
                    <View style={styles.timeBlock}>
                        <Ionicons name="log-out-outline" size={16} color="#8E8E93" />
                        <Text style={styles.timeLabel}> Logout: <Text style={styles.timeValue}>{item.logoutTime}</Text></Text>
                    </View>
                </View>

                <View style={styles.statsRow}>
                    <View style={styles.statGroup}>
                        <Ionicons name="location-outline" size={14} color="#8E8E93" />
                        <Text style={styles.statText}>{item.path?.length || 0} Points</Text>
                    </View>
                    <View style={styles.statGroup}>
                        <Ionicons name="document-text-outline" size={14} color="#8E8E93" />
                        <Text style={styles.statText}>{item.notes?.length || 0} Notes</Text>
                    </View>
                    
                    {!isOngoing && (
                        <TouchableOpacity 
                            onPress={() => downloadReport(item._id, item.date)}
                            style={styles.downloadBtn}
                        >
                            <Ionicons name="cloud-download-outline" size={20} color="#007AFF" />
                            <Text style={styles.downloadBtnText}>Report</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <View style={styles.actionRow}>
                    {isOngoing && (
                        <TouchableOpacity 
                            style={[styles.btn, styles.btnLive]}
                            onPress={() => router.push({ pathname: '/(admin)/live-track', params: { userId }})}
                        >
                            <View style={[styles.dot, { backgroundColor: '#34C759' }]} />
                            <Text style={styles.btnLiveText}>Live Track</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity 
                        style={[styles.btn, styles.btnDetails, !isOngoing && { width: '100%' }]}
                        onPress={() => router.push({ pathname: '/(admin)/details', params: { shiftId: item._id }})}
                    >
                        <Ionicons name="eye-outline" size={18} color="#007AFF" />
                        <Text style={styles.btnDetailsText}> View Details</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.screenHeader}>
                <Ionicons name="chevron-back" size={24} color="#1C1C1E" onPress={() => router.back()} />
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle}>{name || "User"}'s Shifts</Text>
                </View>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#007AFF" />
                </View>
            ) : (
                <FlatList
                    data={shifts}
                    keyExtractor={(item) => item._id}
                    renderItem={renderShiftCard}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={fetchUserHistory} tintColor="#007AFF" />}
                />
            )}
        </View>
    );
}

// ... styles remain the same as your previous code ...
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    screenHeader: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        padding: 20, 
        paddingTop: 50, 
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA'
    },
    headerInfo: { marginLeft: 15 },
    headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1C1C1E' },
    list: { padding: 16 },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    dateText: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
    statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    ongoingBg: { backgroundColor: '#E8F5E9' },
    completedBg: { backgroundColor: '#F2F2F7' },
    statusText: { fontSize: 11, fontWeight: 'bold' },
    ongoingColor: { color: '#34C759' },
    completedColor: { color: '#8E8E93' },
    dot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    ongoingDot: { backgroundColor: '#34C759' },
    completedDot: { backgroundColor: '#8E8E93' },
    timeRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginBottom: 12,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F2F2F7'
    },
    timeBlock: { flexDirection: 'row', alignItems: 'center' },
    timeLabel: { fontSize: 14, color: '#8E8E93' },
    timeValue: { color: '#1C1C1E', fontWeight: '600' },
    statsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
    statGroup: { flexDirection: 'row', alignItems: 'center', marginRight: 15 },
    statText: { fontSize: 13, color: '#8E8E93', marginLeft: 4 },
    downloadBtn: { marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F7FF', padding: 6, borderRadius: 8 },
    downloadBtnText: { color: '#007AFF', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
    actionRow: { flexDirection: 'row', justifyContent: 'space-between' },
    btn: { height: 48, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
    btnLive: { width: '48%', backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: '#34C759' },
    btnDetails: { width: '48%', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#007AFF' },
    btnLiveText: { color: '#34C759', fontWeight: 'bold' },
    btnDetailsText: { color: '#007AFF', fontWeight: 'bold' },
    empty: { alignItems: 'center', marginTop: 100 },
    emptyText: { color: '#8E8E93', fontSize: 16, marginTop: 10 }
});