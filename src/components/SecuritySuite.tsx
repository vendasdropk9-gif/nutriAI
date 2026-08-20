import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Shield, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Play, 
  Terminal, 
  Lock, 
  Unlock, 
  Info, 
  RefreshCw, 
  Bug, 
  FileText,
  History,
  Trash2
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { useAuth } from '../contexts/AuthContext';
import { playSfx, vibrate } from '../lib/sensory';
import { runDatabaseSecurityAudit, logSecurityAttempt } from '../lib/securityTests';

interface TestCase {
  id: string;
  name: string;
  category: 'unauthenticated' | 'authenticated' | 'spoofing' | 'global';
  description: string;
  targetTable: string;
  expectedResult: 'empty_or_error' | 'success_rows' | 'blocked_write';
  status: 'idle' | 'running' | 'passed' | 'failed';
  actualResult?: string;
  errorLog?: string;
  payloadSent?: any;
}

interface SavedSecurityLog {
  id: string;
  test_id: string;
  test_name: string;
  target_table: string;
  action: string;
  result_status: string;
  details: string;
  error_message: string;
  created_at: string;
}

export function SecuritySuite() {
  const { user } = useAuth();
  const [isRunning, setIsRunning] = useState(false);
  const [savedLogs, setSavedLogs] = useState<SavedSecurityLog[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);
  const [activeTab, setActiveTab] = useState<'tests' | 'history'>('tests');

  const [testCases, setTestCases] = useState<TestCase[]>([
    {
      id: 'test_unauth_profiles_read',
      name: 'Leitura Não Autenticada de Perfis',
      category: 'unauthenticated',
      description: 'Garante que agentes externos não autenticados não possam listar perfis do banco de dados.',
      targetTable: 'profiles',
      expectedResult: 'empty_or_error',
      status: 'idle'
    },
    {
      id: 'test_unauth_logs_read',
      name: 'Leitura Não Autenticada de Logs Nutricionais',
      category: 'unauthenticated',
      description: 'Confirma que registros de refeições (intake_logs) estão completamente inacessíveis sem login.',
      targetTable: 'intake_logs',
      expectedResult: 'empty_or_error',
      status: 'idle'
    },
    {
      id: 'test_unauth_fridge_write',
      name: 'Injeção Não Autenticada na Geladeira',
      category: 'unauthenticated',
      description: 'Impede a inserção maliciosa de alimentos na geladeira por usuários anônimos.',
      targetTable: 'fridge_items',
      expectedResult: 'blocked_write',
      status: 'idle'
    },
    {
      id: 'test_identity_spoofing',
      name: 'Simulação de Identidade (Spoofing)',
      category: 'spoofing',
      description: 'Verifica se RLS impede a criação de logs em nome de outro UID de usuário.',
      targetTable: 'intake_logs',
      expectedResult: 'blocked_write',
      status: 'idle'
    },
    {
      id: 'test_cross_user_leak',
      name: 'Vazamento entre Contas (Cross-User Read)',
      category: 'authenticated',
      description: 'Garante que o usuário autenticado não consiga ler logs de outros usuários de forma direta.',
      targetTable: 'progress_logs',
      expectedResult: 'empty_or_error',
      status: 'idle'
    },
    {
      id: 'test_global_herbs_read',
      name: 'Leitura de Tabelas Globais (Controle)',
      category: 'global',
      description: 'Verifica se tabelas públicas de enciclopédia (medicinal_herbs) continuam acessíveis (controle de conexão).',
      targetTable: 'medicinal_herbs',
      expectedResult: 'success_rows',
      status: 'idle'
    },
    {
      id: 'test_global_herbs_write',
      name: 'Escrita em Tabelas Globais',
      category: 'global',
      description: 'Impede que usuários comuns alterem as informações científicas de ervas medicinais.',
      targetTable: 'medicinal_herbs',
      expectedResult: 'blocked_write',
      status: 'idle'
    }
  ]);

  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs(prev => [...prev, `[${timestamp}] ${message}`]);
    console.log(`[RLS TEST] ${message}`);
  };

  // Fetch logged records from Supabase
  const fetchSavedLogs = async () => {
    if (!isSupabaseConfigured) return;
    setIsLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('security_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error fetching security logs:', error.message);
      } else {
        setSavedLogs(data || []);
      }
    } catch (err: any) {
      console.error('Exception fetching security logs:', err);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const clearDatabaseLogs = async () => {
    if (!isSupabaseConfigured) return;
    playSfx('tap');
    if (!window.confirm('Deseja realmente limpar todo o histórico de logs de segurança no banco de dados?')) {
      return;
    }
    try {
      setIsLoadingLogs(true);
      const { error } = await supabase.from('security_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      if (error) {
        addLog(`❌ Erro ao limpar logs no banco: ${error.message}`);
      } else {
        addLog('🧹 Histórico de logs de segurança limpo com sucesso no Supabase!');
        setSavedLogs([]);
      }
    } catch (err: any) {
      addLog(`❌ Exceção ao limpar logs: ${err.message}`);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchSavedLogs();
    }
  }, [activeTab]);

  const runVerificationSuite = async () => {
    if (!isSupabaseConfigured) {
      addLog('ERRO: Supabase não está configurado. Ative a integração primeiro para testar as regras de RLS.');
      vibrate(100);
      return;
    }

    setIsRunning(true);
    setConsoleLogs([]);
    addLog('🚀 Iniciando Suíte de Verificação de Row Level Security (RLS)...');
    playSfx('tap');
    vibrate(30);

    // Run programmatic security audit in background for developer console logs (already logs to Supabase)
    runDatabaseSecurityAudit().catch(err => {
      console.error('Error running programmatic RLS audit:', err);
    });

    // Create a unauthenticated client instance
    const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || '';
    const unauthClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    const updatedTests = [...testCases];

    for (let i = 0; i < updatedTests.length; i++) {
      const tc = updatedTests[i];
      tc.status = 'running';
      setTestCases([...updatedTests]);
      addLog(`Testando: ${tc.name}...`);
      vibrate(10);

      try {
        if (tc.id === 'test_unauth_profiles_read') {
          tc.payloadSent = { query: 'SELECT * FROM profiles LIMIT 5' };
          const { data, error } = await unauthClient.from('profiles').select('*').limit(5);
          
          let status: 'passed' | 'failed' = 'passed';
          let actualRes = '';
          if (error) {
            status = 'passed';
            actualRes = `Bloqueado com sucesso pelo banco. Erro: ${error.message}`;
            addLog(`✅ SECURE: Leitura bloqueada pelo Postgres RLS. (${error.message})`);
          } else if (data && data.length > 0) {
            status = 'failed';
            actualRes = `Vulnerabilidade encontrada! ${data.length} perfis vazados.`;
            addLog(`❌ VULNERABILIDADE: Perfis de usuários foram retornados sem autenticação!`);
          } else {
            status = 'passed';
            actualRes = 'Retornou 0 registros devido à política de isolamento.';
            addLog(`✅ SECURE: Nenhum perfil retornado. RLS isolou os dados.`);
          }
          tc.status = status;
          tc.actualResult = actualRes;

          // Record log to DB
          await logSecurityAttempt({
            testId: tc.id,
            testName: tc.name,
            targetTable: tc.targetTable,
            action: 'SELECT',
            resultStatus: status,
            details: actualRes,
            errorMessage: error?.message,
            userId: user?.uid
          });
        } 
        
        else if (tc.id === 'test_unauth_logs_read') {
          tc.payloadSent = { query: 'SELECT * FROM intake_logs LIMIT 5' };
          const { data, error } = await unauthClient.from('intake_logs').select('*').limit(5);

          let status: 'passed' | 'failed' = 'passed';
          let actualRes = '';
          if (error) {
            status = 'passed';
            actualRes = `Bloqueado. Erro: ${error.message}`;
            addLog(`✅ SECURE: Acesso à tabela intake_logs negado. (${error.message})`);
          } else if (data && data.length > 0) {
            status = 'failed';
            actualRes = `Vulnerabilidade! ${data.length} registros vazados.`;
            addLog(`❌ VULNERABILIDADE: Logs nutricionais vazados publicamente!`);
          } else {
            status = 'passed';
            actualRes = '0 registros retornados (Vazio).';
            addLog(`✅ SECURE: Nenhum log retornado. RLS ativo.`);
          }
          tc.status = status;
          tc.actualResult = actualRes;

          await logSecurityAttempt({
            testId: tc.id,
            testName: tc.name,
            targetTable: tc.targetTable,
            action: 'SELECT',
            resultStatus: status,
            details: actualRes,
            errorMessage: error?.message,
            userId: user?.uid
          });
        } 
        
        else if (tc.id === 'test_unauth_fridge_write') {
          const fakeFood = {
            id: 'security-injection-test-id',
            user_id: 'd3b07384-d113-4ec6-a5d2-3c1c1fcf0df4',
            name: 'Injeção RLS Não Autenticada',
            category: 'Malicioso',
            qty: '1kg'
          };
          tc.payloadSent = fakeFood;
          const { data, error } = await unauthClient.from('fridge_items').insert([fakeFood]).select();

          let status: 'passed' | 'failed' = 'passed';
          let actualRes = '';
          if (error) {
            status = 'passed';
            actualRes = `Escrita impedida. Erro: ${error.message}`;
            addLog(`✅ SECURE: Inserção anônima bloqueada. (${error.message})`);
          } else if (data && data.length > 0) {
            status = 'failed';
            actualRes = 'Gravado com sucesso no banco!';
            addLog(`❌ VULNERABILIDADE: Escrita anônima bem sucedida em fridge_items!`);
          } else {
            status = 'passed';
            actualRes = 'Operação de escrita rejeitada pelo RLS.';
            addLog(`✅ SECURE: Gravação rejeitada com sucesso.`);
          }
          tc.status = status;
          tc.actualResult = actualRes;

          await logSecurityAttempt({
            testId: tc.id,
            testName: tc.name,
            targetTable: tc.targetTable,
            action: 'INSERT',
            resultStatus: status,
            details: actualRes,
            errorMessage: error?.message,
            userId: user?.uid
          });
        } 
        
        else if (tc.id === 'test_identity_spoofing') {
          const randomVictimId = '8ce5c4a3-970d-48c7-9981-6007be84c03f';
          const spoofedPayload = {
            user_id: randomVictimId,
            meal_type: 'Almoço Malicioso',
            calories: 9999,
            protein: 0,
            carbs: 0,
            fat: 0,
            items: ['Ataque Spoofing']
          };
          tc.payloadSent = spoofedPayload;
          
          const { data, error } = await supabase.from('intake_logs').insert([spoofedPayload]).select();

          let status: 'passed' | 'failed' = 'passed';
          let actualRes = '';
          if (error) {
            status = 'passed';
            actualRes = `Impedido. Erro: ${error.message}`;
            addLog(`✅ SECURE: Tentativa de spoofing de identidade rejeitada. (${error.message})`);
          } else if (data && data.length > 0) {
            status = 'failed';
            actualRes = `Vulnerabilidade! Registro gravado em nome de ${randomVictimId}`;
            addLog(`❌ VULNERABILIDADE: Permitido gravar registro com user_id de outra pessoa!`);
          } else {
            status = 'passed';
            actualRes = 'Rejeitado silenciosamente pelo banco (0 registros afetados).';
            addLog(`✅ SECURE: Spoofing rejeitado pelo banco.`);
          }
          tc.status = status;
          tc.actualResult = actualRes;

          await logSecurityAttempt({
            testId: tc.id,
            testName: tc.name,
            targetTable: tc.targetTable,
            action: 'INSERT',
            resultStatus: status,
            details: actualRes,
            errorMessage: error?.message,
            userId: user?.uid
          });
        } 
        
        else if (tc.id === 'test_cross_user_leak') {
          const randomVictimId = '77777777-7777-7777-7777-777777777777';
          tc.payloadSent = { target_user_id: randomVictimId };
          
          const { data, error } = await supabase
            .from('progress_logs')
            .select('*')
            .eq('user_id', randomVictimId);

          let status: 'passed' | 'failed' = 'passed';
          let actualRes = '';
          if (error) {
            status = 'passed';
            actualRes = `Leitura cruzada rejeitada. Erro: ${error.message}`;
            addLog(`✅ SECURE: Acesso aos dados do usuário ${randomVictimId} foi negado.`);
          } else if (data && data.length > 0) {
            status = 'failed';
            actualRes = `Vulnerabilidade! Vazou ${data.length} logs de progresso da vítima.`;
            addLog(`❌ VULNERABILIDADE: Leitura cruzada autorizada! Vazamento de logs.`);
          } else {
            status = 'passed';
            actualRes = 'Nenhum registro de outro usuário pôde ser retornado.';
            addLog(`✅ SECURE: Consulta de outro usuário retornou zero resultados (Isolamento total).`);
          }
          tc.status = status;
          tc.actualResult = actualRes;

          await logSecurityAttempt({
            testId: tc.id,
            testName: tc.name,
            targetTable: tc.targetTable,
            action: 'SELECT',
            resultStatus: status,
            details: actualRes,
            errorMessage: error?.message,
            userId: user?.uid
          });
        } 
        
        else if (tc.id === 'test_global_herbs_read') {
          tc.payloadSent = { query: 'SELECT * FROM medicinal_herbs LIMIT 1' };
          const { data, error } = await supabase.from('medicinal_herbs').select('*').limit(1);

          let status: 'passed' | 'failed' = 'passed';
          let actualRes = '';
          if (error) {
            status = 'failed';
            actualRes = `Falha de conexão ou erro no banco: ${error.message}`;
            addLog(`❌ ERRO: Falha ao ler tabela global. O banco pode estar inativo ou sem conexão.`);
          } else {
            status = 'passed';
            actualRes = `Sucesso. Retornou ${data?.length || 0} registros globais públicos.`;
            addLog(`✅ SECURE (CONTROLE): Tabela global acessada perfeitamente. Conexão ativa.`);
          }
          tc.status = status;
          tc.actualResult = actualRes;

          await logSecurityAttempt({
            testId: tc.id,
            testName: tc.name,
            targetTable: tc.targetTable,
            action: 'SELECT',
            resultStatus: status,
            details: actualRes,
            errorMessage: error?.message,
            userId: user?.uid
          });
        } 
        
        else if (tc.id === 'test_global_herbs_write') {
          const malicousHerb = {
            id: 'hacked-herb-id',
            popular_name: 'Hackeado',
            scientific_name: 'Hacked scientia',
            botanical_family: 'Vulnerabilidade',
            description: 'Manipulando enciclopédia pública'
          };
          tc.payloadSent = malicousHerb;
          const { data, error } = await supabase.from('medicinal_herbs').insert([malicousHerb]).select();

          let status: 'passed' | 'failed' = 'passed';
          let actualRes = '';
          if (error) {
            status = 'passed';
            actualRes = `Bloqueado. Erro: ${error.message}`;
            addLog(`✅ SECURE: Escrita em tabela global bloqueada. (${error.message})`);
          } else if (data && data.length > 0) {
            status = 'failed';
            actualRes = 'Gravação realizada com sucesso!';
            addLog(`❌ VULNERABILIDADE: Usuários comuns podem alterar a tabela global medicinal_herbs!`);
          } else {
            status = 'passed';
            actualRes = 'Alteração rejeitada.';
            addLog(`✅ SECURE: Escrita global rejeitada com sucesso.`);
          }
          tc.status = status;
          tc.actualResult = actualRes;

          await logSecurityAttempt({
            testId: tc.id,
            testName: tc.name,
            targetTable: tc.targetTable,
            action: 'INSERT',
            resultStatus: status,
            details: actualRes,
            errorMessage: error?.message,
            userId: user?.uid
          });
        }
      } catch (err: any) {
        tc.status = 'failed';
        tc.errorLog = err.message;
        tc.actualResult = `Exceção inesperada: ${err.message}`;
        addLog(`❌ CRITICAL EXCEPTION: ${err.message}`);
      }

      setTestCases([...updatedTests]);
    }

    addLog('🎉 Suíte de Verificação RLS concluída!');
    setIsRunning(false);
    playSfx('success');
    vibrate([50, 50]);
    
    // Refresh history if active
    if (activeTab === 'history') {
      fetchSavedLogs();
    }
  };

  const getStatusBadge = (status: TestCase['status']) => {
    switch (status) {
      case 'idle':
        return <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 font-bold px-2 py-0.5 rounded-full">Aguardando</span>;
      case 'running':
        return <span className="text-[10px] bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1">Testando...</span>;
      case 'passed':
        return <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">✨ Protegido</span>;
      case 'failed':
        return <span className="text-[10px] bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">⚠️ Vulnerável</span>;
    }
  };

  const passedCount = testCases.filter(t => t.status === 'passed').length;
  const totalCount = testCases.length;

  return (
    <div className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-white/40 dark:border-slate-800/50 p-6 rounded-[2rem] shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-600 dark:text-emerald-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-sans font-bold text-lg text-slate-800 dark:text-slate-100">
              Auditoria de Row Level Security (RLS)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verificação em tempo real de isolamento de dados no banco PostgreSQL Supabase.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <button
            type="button"
            onClick={runVerificationSuite}
            disabled={isRunning}
            className={`flex items-center justify-center gap-2 px-5 py-3 rounded-full text-sm font-semibold transition-all shadow-md w-full sm:w-auto ${
              isRunning 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95'
            }`}
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Executando...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-white" />
                Executar Testes de RLS
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-800">
        <button
          onClick={() => { playSfx('tap'); setActiveTab('tests'); }}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'tests' 
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Casos de Teste Ativos
        </button>
        <button
          onClick={() => { playSfx('tap'); setActiveTab('history'); }}
          disabled={!isSupabaseConfigured}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'history' 
              ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
              : 'border-transparent text-slate-400 hover:text-slate-600'
          } ${!isSupabaseConfigured ? 'opacity-55 cursor-not-allowed' : ''}`}
        >
          Histórico do Banco (security_logs)
        </button>
      </div>

      {!isSupabaseConfigured && (
        <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/30 rounded-2xl flex gap-3 text-amber-700 dark:text-amber-400 text-xs leading-relaxed">
          <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold mb-1">Integração do Supabase não configurada</p>
            <p>O aplicativo está rodando em modo offline com banco local. Ative as chaves no painel do AI Studio para que as auditorias ocorram contra a instância real do Supabase.</p>
          </div>
        </div>
      )}

      {activeTab === 'tests' ? (
        <div className="space-y-6">
          {/* Stats row */}
          {totalCount > 0 && testCases.some(t => t.status !== 'idle') && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60 p-4 rounded-2xl flex items-center justify-between">
                <span className="text-xs text-slate-500">Total de Auditorias</span>
                <span className="font-bold text-lg text-slate-800 dark:text-white">{totalCount}</span>
              </div>
              <div className="bg-emerald-500/5 dark:bg-emerald-500/5 border border-emerald-100/50 dark:border-emerald-950/30 p-4 rounded-2xl flex items-center justify-between">
                <span className="text-xs text-slate-500">Sucessos (Seguros)</span>
                <span className="font-bold text-lg text-emerald-600 dark:text-emerald-400">{passedCount}</span>
              </div>
              <div className="bg-rose-500/5 dark:bg-rose-500/5 border border-rose-100/50 dark:border-rose-950/30 p-4 rounded-2xl flex items-center justify-between">
                <span className="text-xs text-slate-500">Vulnerabilidades</span>
                <span className="font-bold text-lg text-rose-600 dark:text-rose-400">
                  {testCases.filter(t => t.status === 'failed').length}
                </span>
              </div>
            </div>
          )}

          {/* Tests Grid */}
          <div className="space-y-3">
            {testCases.map((tc) => (
              <div 
                key={tc.id}
                className="p-4 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/10 space-y-2 hover:border-slate-200 dark:hover:border-slate-800/80 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    {tc.status === 'passed' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    ) : tc.status === 'failed' ? (
                      <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0" />
                    ) : (
                      <Lock className="w-4 h-4 text-slate-400 shrink-0" />
                    )}
                    <span className="font-bold text-sm text-slate-700 dark:text-slate-200">{tc.name}</span>
                  </div>
                  {getStatusBadge(tc.status)}
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed pl-6">
                  {tc.description}
                </p>

                {tc.actualResult && (
                  <div className="pl-6 pt-1 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      <Bug className="w-3.5 h-3.5" /> Resultado da Consulta
                    </div>
                    <div className="p-2.5 bg-slate-900 text-slate-300 font-mono text-[11px] rounded-xl overflow-x-auto border border-slate-800">
                      {tc.actualResult}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Interactive terminal logs */}
          {consoleLogs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <Terminal className="w-4 h-4" />
                Logs do Motor de Segurança
              </div>
              <div className="h-40 bg-slate-950 p-4 rounded-2xl border border-slate-800 font-mono text-xs text-emerald-400/90 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-emerald-500/20">
                {consoleLogs.map((log, index) => (
                  <div key={index} className="leading-relaxed">
                    {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <History className="w-4 h-4" /> Últimos registros na tabela 'security_logs'
            </h4>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchSavedLogs}
                disabled={isLoadingLogs}
                className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors rounded-lg bg-slate-100 dark:bg-slate-800/50"
                title="Recarregar logs"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingLogs ? 'animate-spin' : ''}`} />
              </button>
              <button
                type="button"
                onClick={clearDatabaseLogs}
                disabled={isLoadingLogs || savedLogs.length === 0}
                className="p-2 text-rose-400 hover:text-rose-600 transition-colors rounded-lg bg-rose-500/5 hover:bg-rose-500/10"
                title="Limpar tabela"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {isLoadingLogs ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-400 text-xs gap-2">
              <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
              Buscando registros no Supabase...
            </div>
          ) : savedLogs.length === 0 ? (
            <div className="h-48 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-400 text-xs p-6 text-center gap-2">
              <Info className="w-6 h-6 text-slate-300" />
              <p className="font-medium">Nenhum log de segurança gravado ainda.</p>
              <p className="text-[11px] max-w-sm">Execute a suíte de verificação clicando no botão "Executar Testes de RLS" para registrar tentativas de segurança reais no banco de dados.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {savedLogs.map((log) => (
                <div 
                  key={log.id} 
                  className="p-3.5 bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/80 rounded-xl space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-extrabold uppercase ${
                          log.result_status === 'passed' 
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400' 
                            : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400'
                        }`}>
                          {log.result_status === 'passed' ? 'Bloqueado' : 'Falha'}
                        </span>
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                          {log.test_name}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-2 font-mono">
                        <span>Tabela: <b className="text-slate-500">{log.target_table}</b></span>
                        <span>Ação: <b className="text-slate-500">{log.action}</b></span>
                      </div>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-900/5 dark:bg-slate-950/50 p-2 rounded-lg font-mono leading-relaxed break-all">
                    {log.details}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
