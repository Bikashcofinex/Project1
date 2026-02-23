import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

type Sport = 'Cricket' | 'Football';
type Role = 'USER' | 'ADMIN';
type SettlementResult = 'WIN' | 'LOSE' | 'VOID';

type Market = {
  label: string;
  odds: number;
};

type MatchCard = {
  id: string;
  sport: Sport;
  league: string;
  startTime: string;
  teamA: string;
  teamB: string;
  markets: Market[];
};

type BetSelection = {
  matchId: string;
  fixture: string;
  marketLabel: string;
  odds: number;
  sport: Sport;
};

type BetHistory = BetSelection & {
  id: string;
  stake: number;
  payout: number;
  status: 'PLACED' | 'SETTLED';
  result: SettlementResult | null;
  placedAt: string;
  settledAt: string | null;
};

type AdminOpenBet = BetHistory & {
  userName: string;
  userEmail: string;
};

type UserProfile = {
  id: string;
  name: string;
  email: string;
  wallet: number;
  role: Role;
};

const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:4000/api' : 'http://localhost:4000/api';
const TOKEN_KEY = 'betting_auth_token';

async function apiRequest(path: string, options: RequestInit = {}, token?: string) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

function App() {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [selectedSport, setSelectedSport] = useState<Sport>('Cricket');
  const [matches, setMatches] = useState<MatchCard[]>([]);
  const [selection, setSelection] = useState<BetSelection | null>(null);
  const [stakeText, setStakeText] = useState('100');
  const [betHistory, setBetHistory] = useState<BetHistory[]>([]);
  const [adminOpenBets, setAdminOpenBets] = useState<AdminOpenBet[]>([]);

  const [busy, setBusy] = useState(false);
  const [adminBusy, setAdminBusy] = useState(false);
  const [message, setMessage] = useState('Login to start betting.');

  const stake = Number(stakeText);
  const payout = selection ? stake * selection.odds : 0;
  const userIsAdmin = user?.role === 'ADMIN';
  const wallet = user?.wallet ?? 0;

  const canPlaceBet =
    Boolean(selection) &&
    Boolean(user) &&
    Number.isInteger(stake) &&
    stake > 0 &&
    stake <= wallet;

  const formattedBets = useMemo(() => betHistory.slice(0, 8), [betHistory]);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        if (!storedToken) {
          setAuthLoading(false);
          return;
        }

        const profileResponse = await apiRequest('/me', { method: 'GET' }, storedToken);
        setToken(storedToken);
        setUser(profileResponse.user);
        setMessage(`Welcome back, ${profileResponse.user.name}.`);
      } catch (_error) {
        await AsyncStorage.removeItem(TOKEN_KEY);
      } finally {
        setAuthLoading(false);
      }
    };

    restoreSession();
  }, []);

  useEffect(() => {
    if (!token) {
      return;
    }

    const loadMatches = async () => {
      try {
        const response = await apiRequest(
          `/matches?sport=${encodeURIComponent(selectedSport)}`,
          { method: 'GET' },
          token,
        );
        setMatches(response.matches || []);
      } catch (error) {
        setMatches([]);
        setMessage((error as Error).message);
      }
    };

    loadMatches();
  }, [selectedSport, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    const loadBets = async () => {
      try {
        const response = await apiRequest('/bets', { method: 'GET' }, token);
        setBetHistory(response.bets || []);
        setUser(prev => (prev ? { ...prev, wallet: response.wallet } : prev));
      } catch (error) {
        setMessage((error as Error).message);
      }
    };

    loadBets();
  }, [token]);

  useEffect(() => {
    if (!token || !userIsAdmin) {
      setAdminOpenBets([]);
      return;
    }

    const loadAdminOpenBets = async () => {
      try {
        const response = await apiRequest('/admin/bets/open', { method: 'GET' }, token);
        setAdminOpenBets(response.bets || []);
      } catch (error) {
        setMessage((error as Error).message);
      }
    };

    loadAdminOpenBets();
  }, [token, userIsAdmin]);

  const refreshOwnBets = async (authToken: string) => {
    const response = await apiRequest('/bets', { method: 'GET' }, authToken);
    setBetHistory(response.bets || []);
    setUser(prev => (prev ? { ...prev, wallet: response.wallet } : prev));
  };

  const onAuthSubmit = async () => {
    if (!email || !password || (authMode === 'register' && !name)) {
      setMessage('Please fill all required auth fields.');
      return;
    }

    setBusy(true);
    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register';
      const payload = authMode === 'login' ? { email, password } : { name, email, password };

      const response = await apiRequest(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      await AsyncStorage.setItem(TOKEN_KEY, response.token);
      setToken(response.token);
      setUser(response.user);
      setSelection(null);
      setBetHistory([]);
      setMessage(`Authenticated as ${response.user.name} (${response.user.role}).`);
      setPassword('');
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const onLogout = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setUser(null);
    setMatches([]);
    setSelection(null);
    setBetHistory([]);
    setAdminOpenBets([]);
    setMessage('Logged out.');
  };

  const onPickMarket = (match: MatchCard, market: Market) => {
    setSelection({
      matchId: match.id,
      fixture: `${match.teamA} vs ${match.teamB}`,
      marketLabel: market.label,
      odds: market.odds,
      sport: match.sport,
    });
    setMessage('Bet slip updated. Enter stake and place bet.');
  };

  const placeBet = async () => {
    if (!token || !selection) {
      setMessage('Select a market first.');
      return;
    }

    if (!Number.isInteger(stake) || stake <= 0) {
      setMessage('Stake must be a positive whole number.');
      return;
    }

    setBusy(true);
    try {
      const response = await apiRequest(
        '/bets',
        {
          method: 'POST',
          body: JSON.stringify({
            matchId: selection.matchId,
            marketLabel: selection.marketLabel,
            sport: selection.sport,
            stake,
          }),
        },
        token,
      );

      setBetHistory(response.bets || []);
      setUser(prev => (prev ? { ...prev, wallet: response.wallet } : prev));
      setSelection(null);
      setMessage(`Bet placed on ${response.bet.fixture}.`);

      if (userIsAdmin) {
        const openResponse = await apiRequest('/admin/bets/open', { method: 'GET' }, token);
        setAdminOpenBets(openResponse.bets || []);
      }
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const settleBet = async (betId: string, result: SettlementResult) => {
    if (!token || !userIsAdmin) {
      return;
    }

    setAdminBusy(true);
    try {
      const response = await apiRequest(
        `/admin/bets/${betId}/settle`,
        {
          method: 'POST',
          body: JSON.stringify({ result }),
        },
        token,
      );

      setAdminOpenBets(prev => prev.filter(item => item.id !== betId));
      if (response.userId === user.id) {
        await refreshOwnBets(token);
      }
      setMessage(`Bet ${betId.slice(0, 8)} settled as ${result}.`);
    } catch (error) {
      setMessage((error as Error).message);
    } finally {
      setAdminBusy(false);
    }
  };

  if (authLoading) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.loaderScreen}>
          <ActivityIndicator size="large" color="#7de9b0" />
          <Text style={styles.loaderText}>Loading session...</Text>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Multi-Sport Betting</Text>
          <Text style={styles.subtitle}>Cricket + Football with live odds API</Text>

          {!token || !user ? (
            <View style={styles.authCard}>
              <View style={styles.switchRow}>
                {(['login', 'register'] as const).map(mode => (
                  <Pressable
                    key={mode}
                    style={[styles.switchButton, authMode === mode && styles.switchButtonActive]}
                    onPress={() => setAuthMode(mode)}>
                    <Text style={[styles.switchText, authMode === mode && styles.switchTextActive]}>
                      {mode === 'login' ? 'Login' : 'Register'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {authMode === 'register' ? (
                <TextInput
                  style={styles.input}
                  placeholder="Name"
                  placeholderTextColor="#769ab5"
                  value={name}
                  onChangeText={setName}
                />
              ) : null}

              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor="#769ab5"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#769ab5"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              <Pressable
                style={[styles.betButton, busy && styles.betButtonDisabled]}
                disabled={busy}
                onPress={onAuthSubmit}>
                <Text style={styles.betButtonText}>
                  {busy ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Create Account'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={styles.walletCard}>
                <Text style={styles.walletLabel}>Wallet Balance</Text>
                <Text style={styles.walletValue}>${wallet}</Text>
                <Text style={styles.welcomeText}>
                  {user.name} ({user.role})
                </Text>
                <Pressable style={styles.logoutButton} onPress={onLogout}>
                  <Text style={styles.logoutButtonText}>Logout</Text>
                </Pressable>
              </View>

              <View style={styles.switchRow}>
                {(['Cricket', 'Football'] as const).map(item => (
                  <Pressable
                    key={item}
                    style={[styles.switchButton, selectedSport === item && styles.switchButtonActive]}
                    onPress={() => {
                      setSelectedSport(item);
                      setSelection(null);
                      setMessage(`Showing ${item} markets.`);
                    }}>
                    <Text style={[styles.switchText, selectedSport === item && styles.switchTextActive]}>
                      {item}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.sectionTitle}>Live Markets</Text>
              {matches.map(match => (
                <View key={match.id} style={styles.matchCard}>
                  <Text style={styles.leagueText}>
                    {match.league} - {match.startTime}
                  </Text>
                  <Text style={styles.fixtureText}>
                    {match.teamA} vs {match.teamB}
                  </Text>
                  <View style={styles.marketRow}>
                    {match.markets.map(market => {
                      const active = selection?.matchId === match.id && selection.marketLabel === market.label;
                      return (
                        <Pressable
                          key={market.label}
                          style={[styles.marketButton, active && styles.marketActive]}
                          onPress={() => onPickMarket(match, market)}>
                          <Text style={styles.marketLabel}>{market.label}</Text>
                          <Text style={styles.marketOdds}>@ {market.odds}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ))}

              <Text style={styles.sectionTitle}>Bet Slip</Text>
              <View style={styles.betSlipCard}>
                {selection ? (
                  <>
                    <Text style={styles.betSlipFixture}>{selection.fixture}</Text>
                    <Text style={styles.betSlipMarket}>
                      {selection.marketLabel} @ {selection.odds}
                    </Text>
                  </>
                ) : (
                  <Text style={styles.betSlipEmpty}>No selection yet.</Text>
                )}
                <TextInput
                  style={styles.input}
                  value={stakeText}
                  onChangeText={setStakeText}
                  keyboardType="number-pad"
                  placeholder="Stake amount"
                  placeholderTextColor="#769ab5"
                />
                <Text style={styles.payoutText}>
                  Potential Payout: ${Number.isFinite(payout) ? payout.toFixed(2) : '0.00'}
                </Text>
                <Pressable
                  style={[styles.betButton, (!canPlaceBet || busy) && styles.betButtonDisabled]}
                  onPress={placeBet}
                  disabled={!canPlaceBet || busy}>
                  <Text style={styles.betButtonText}>{busy ? 'Placing...' : 'Place Bet'}</Text>
                </Pressable>
              </View>

              <Text style={styles.sectionTitle}>Recent Bets</Text>
              <View style={styles.historyCard}>
                {formattedBets.length === 0 ? (
                  <Text style={styles.historyEmpty}>No bets placed yet.</Text>
                ) : (
                  formattedBets.map(item => (
                    <View key={item.id} style={styles.historyItem}>
                      <Text style={styles.historyFixture}>{item.fixture}</Text>
                      <Text style={styles.historyMeta}>
                        {item.sport} | {item.marketLabel} ({item.status})
                      </Text>
                      <Text style={styles.historyMeta}>
                        Stake ${item.stake} - Payout ${item.payout.toFixed(2)}
                      </Text>
                      {item.result ? (
                        <Text style={styles.historyMeta}>Result: {item.result}</Text>
                      ) : null}
                    </View>
                  ))
                )}
              </View>

              {userIsAdmin ? (
                <>
                  <Text style={styles.sectionTitle}>Admin Settlement</Text>
                  <View style={styles.adminCard}>
                    {adminOpenBets.length === 0 ? (
                      <Text style={styles.historyEmpty}>No open bets to settle.</Text>
                    ) : (
                      adminOpenBets.map(item => (
                        <View key={item.id} style={styles.historyItem}>
                          <Text style={styles.historyFixture}>{item.fixture}</Text>
                          <Text style={styles.historyMeta}>
                            {item.userName} ({item.userEmail})
                          </Text>
                          <Text style={styles.historyMeta}>
                            Stake ${item.stake} - Payout ${item.payout.toFixed(2)}
                          </Text>
                          <View style={styles.adminButtonRow}>
                            <Pressable
                              style={[styles.outcomeButton, styles.outcomeWin]}
                              disabled={adminBusy}
                              onPress={() => settleBet(item.id, 'WIN')}>
                              <Text style={styles.outcomeText}>WIN</Text>
                            </Pressable>
                            <Pressable
                              style={[styles.outcomeButton, styles.outcomeLose]}
                              disabled={adminBusy}
                              onPress={() => settleBet(item.id, 'LOSE')}>
                              <Text style={styles.outcomeText}>LOSE</Text>
                            </Pressable>
                            <Pressable
                              style={[styles.outcomeButton, styles.outcomeVoid]}
                              disabled={adminBusy}
                              onPress={() => settleBet(item.id, 'VOID')}>
                              <Text style={styles.outcomeText}>VOID</Text>
                            </Pressable>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                </>
              ) : null}
            </>
          )}

          <Text style={styles.message}>{message}</Text>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0a1d2f',
  },
  loaderScreen: {
    flex: 1,
    backgroundColor: '#0a1d2f',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loaderText: {
    color: '#c5ddef',
  },
  container: {
    padding: 16,
    paddingBottom: 28,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#f6fbff',
  },
  subtitle: {
    fontSize: 14,
    color: '#a1bdd2',
    marginTop: 4,
    marginBottom: 14,
  },
  authCard: {
    backgroundColor: '#102a41',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#224a6b',
    padding: 12,
    marginBottom: 14,
  },
  walletCard: {
    backgroundColor: '#143451',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2f597c',
    marginBottom: 14,
  },
  walletLabel: {
    fontSize: 13,
    color: '#9bb8cf',
  },
  walletValue: {
    fontSize: 28,
    fontWeight: '700',
    color: '#67e8a7',
  },
  welcomeText: {
    color: '#b4d0e3',
    marginTop: 3,
    marginBottom: 8,
  },
  logoutButton: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4f7aa0',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#173653',
  },
  logoutButtonText: {
    color: '#c8e0f0',
    fontWeight: '700',
  },
  switchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  switchButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2f597c',
    backgroundColor: '#102a41',
    alignItems: 'center',
  },
  switchButtonActive: {
    backgroundColor: '#1f5f8b',
    borderColor: '#66b0e1',
  },
  switchText: {
    color: '#9bb8cf',
    fontWeight: '700',
  },
  switchTextActive: {
    color: '#f3f9ff',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e6f2fb',
    marginBottom: 8,
    marginTop: 6,
  },
  matchCard: {
    backgroundColor: '#102a41',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#224a6b',
    padding: 12,
    marginBottom: 10,
  },
  leagueText: {
    fontSize: 12,
    color: '#8fb0ca',
    marginBottom: 4,
  },
  fixtureText: {
    fontSize: 16,
    color: '#f0f8ff',
    fontWeight: '700',
    marginBottom: 8,
  },
  marketRow: {
    gap: 8,
  },
  marketButton: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#34597a',
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: '#173653',
  },
  marketActive: {
    borderColor: '#7de9b0',
    backgroundColor: '#1e4c57',
  },
  marketLabel: {
    color: '#d9ecfa',
    fontSize: 13,
    marginBottom: 2,
  },
  marketOdds: {
    color: '#8ce7b4',
    fontWeight: '700',
    fontSize: 13,
  },
  betSlipCard: {
    backgroundColor: '#102a41',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#224a6b',
    padding: 12,
  },
  betSlipFixture: {
    color: '#f1f8fe',
    fontWeight: '700',
    fontSize: 15,
  },
  betSlipMarket: {
    color: '#a3c1d7',
    marginTop: 4,
    marginBottom: 10,
  },
  betSlipEmpty: {
    color: '#98b5ca',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#3b6385',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ebf7ff',
    marginBottom: 10,
    backgroundColor: '#173653',
  },
  payoutText: {
    color: '#f1fbff',
    fontWeight: '700',
    marginBottom: 10,
  },
  betButton: {
    backgroundColor: '#22b473',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  betButtonDisabled: {
    opacity: 0.45,
  },
  betButtonText: {
    color: '#082012',
    fontWeight: '800',
    fontSize: 15,
  },
  historyCard: {
    backgroundColor: '#102a41',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#224a6b',
    padding: 12,
  },
  adminCard: {
    backgroundColor: '#0d354b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2f6888',
    padding: 12,
  },
  historyEmpty: {
    color: '#9ab8ce',
  },
  historyItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#2b4c6b',
    paddingBottom: 8,
    marginBottom: 8,
  },
  historyFixture: {
    color: '#f2fbff',
    fontWeight: '700',
    marginBottom: 3,
  },
  historyMeta: {
    color: '#a5c2d8',
    fontSize: 12,
  },
  adminButtonRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  outcomeButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  outcomeWin: {
    backgroundColor: '#1f7d4e',
  },
  outcomeLose: {
    backgroundColor: '#93524f',
  },
  outcomeVoid: {
    backgroundColor: '#506388',
  },
  outcomeText: {
    color: '#eef7ff',
    fontWeight: '700',
  },
  message: {
    color: '#9dc3de',
    marginTop: 10,
    fontSize: 13,
  },
});

export default App;
