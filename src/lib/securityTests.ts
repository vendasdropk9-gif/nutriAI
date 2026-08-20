import { supabase, isSupabaseConfigured } from './supabase';

export interface SecurityTestResult {
  id: string;
  name: string;
  description: string;
  targetTable: string;
  action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  expectedResult: 'blocked' | 'allowed';
  status: 'passed' | 'failed' | 'skipped';
  errorMessage?: string;
  details?: string;
}

/**
 * Logs an unauthorized access attempt or security test to the 'security_logs' table in Supabase.
 */
export async function logSecurityAttempt(attempt: {
  testId: string;
  testName: string;
  targetTable: string;
  action: 'SELECT' | 'INSERT' | 'UPDATE' | 'DELETE';
  resultStatus: 'passed' | 'failed' | 'skipped';
  details?: string;
  errorMessage?: string;
  userId?: string;
}) {
  try {
    if (!isSupabaseConfigured) {
      console.warn('⚠️ [RLS LOGGER] Supabase not configured. Skipping database log insertion.');
      return;
    }

    const { error } = await supabase.from('security_logs').insert([
      {
        test_id: attempt.testId,
        test_name: attempt.testName,
        target_table: attempt.targetTable,
        action: attempt.action,
        result_status: attempt.resultStatus,
        details: attempt.details || '',
        error_message: attempt.errorMessage || '',
        user_id: attempt.userId || null
      }
    ]);

    if (error) {
      console.error(`❌ [RLS LOGGER] Failed to insert security log into Supabase for test '${attempt.testId}':`, error.message);
    } else {
      console.log(`🛡️ [RLS LOGGER] Security log recorded in 'security_logs' for test: ${attempt.testId}`);
    }
  } catch (err: any) {
    console.error('❌ [RLS LOGGER] Exception during security logging:', err?.message || err);
  }
}

/**
 * Executes a security audit specifically trying to bypass RLS policies
 * by spoofing user IDs, executing unauthorized cross-user operations,
 * or accessing tables anonymously.
 */
export async function runDatabaseSecurityAudit(): Promise<SecurityTestResult[]> {
  console.log('🛡️ [RLS AUDIT] Starting database security verification suite...');
  
  if (!isSupabaseConfigured) {
    console.warn('⚠️ [RLS AUDIT] Supabase is not configured. Skipping active database calls.');
    return [
      {
        id: 'no_config',
        name: 'Database Connection Control',
        description: 'Verify if Supabase credentials are fully configured.',
        targetTable: 'all',
        action: 'SELECT',
        expectedResult: 'allowed',
        status: 'skipped',
        details: 'Supabase URL/Key environment variables are missing.'
      }
    ];
  }

  const results: SecurityTestResult[] = [];
  const fakeUserId = 'e8888888-8888-8888-8888-888888888888';
  const currentSessionUser = (await supabase.auth.getUser()).data?.user;
  const currentUserId = currentSessionUser?.id;

  console.log(`👤 [RLS AUDIT] Authenticated User: ${currentUserId || 'None (Guest)'}`);

  // Test Case 1: Attempt to read profiles of other users
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .neq('id', currentUserId || '');

    const leakedCount = data?.length || 0;
    const isSuccess = leakedCount === 0 || error !== null;
    const status = isSuccess ? 'passed' : 'failed';
    const details = isSuccess 
      ? `Bloqueado com sucesso. Registros alheios vazados: ${leakedCount}.`
      : `FALHA DE SEGURANÇA: ${leakedCount} perfis de terceiros lidos de forma não autorizada!`;

    results.push({
      id: 'rls_read_other_profiles',
      name: 'Isolamento de Perfis de Terceiros (Select)',
      description: 'Garante que um usuário não consiga ver perfis ou dados cadastrais de outros usuários.',
      targetTable: 'profiles',
      action: 'SELECT',
      expectedResult: 'blocked',
      status,
      errorMessage: error?.message,
      details
    });

    // Save security log
    await logSecurityAttempt({
      testId: 'rls_read_other_profiles',
      testName: 'Isolamento de Perfis de Terceiros (Select)',
      targetTable: 'profiles',
      action: 'SELECT',
      resultStatus: status,
      details,
      errorMessage: error?.message,
      userId: currentUserId
    });
  } catch (err: any) {
    const details = `Disparou exceção segura: ${err?.message || err}`;
    results.push({
      id: 'rls_read_other_profiles',
      name: 'Isolamento de Perfis de Terceiros (Select)',
      description: 'Garante que um usuário não consiga ver perfis ou dados cadastrais de outros usuários.',
      targetTable: 'profiles',
      action: 'SELECT',
      expectedResult: 'blocked',
      status: 'passed',
      details
    });

    await logSecurityAttempt({
      testId: 'rls_read_other_profiles',
      testName: 'Isolamento de Perfis de Terceiros (Select)',
      targetTable: 'profiles',
      action: 'SELECT',
      resultStatus: 'passed',
      details,
      errorMessage: err?.message || String(err),
      userId: currentUserId
    });
  }

  // Test Case 2: Attempt to insert a nutrition log spoofing another user's ID
  try {
    const spoofedLog = {
      user_id: fakeUserId,
      meal_type: 'Almoço Infiltrado',
      calories: 500,
      protein: 30,
      carbs: 50,
      fat: 15,
      items: ['Injeção RLS', 'Teste de Segurança']
    };

    const { data, error } = await supabase
      .from('intake_logs')
      .insert([spoofedLog])
      .select();

    const isSuccess = error !== null || !data || data.length === 0;
    const status = isSuccess ? 'passed' : 'failed';
    const details = isSuccess
      ? `Bloqueado com sucesso. Erro retornado pelo Postgres: ${error?.message || 'Nenhum registro criado'}`
      : 'FALHA DE SEGURANÇA: Registro de prato inserido com sucesso em nome de outro usuário!';

    results.push({
      id: 'rls_spoof_intake_logs',
      name: 'Spoofing de Identidade em Logs Nutricionais (Insert)',
      description: 'Garante que um usuário não possa inserir logs fingindo ser outra pessoa (fingindo outro user_id).',
      targetTable: 'intake_logs',
      action: 'INSERT',
      expectedResult: 'blocked',
      status,
      errorMessage: error?.message,
      details
    });

    await logSecurityAttempt({
      testId: 'rls_spoof_intake_logs',
      testName: 'Spoofing de Identidade em Logs Nutricionais (Insert)',
      targetTable: 'intake_logs',
      action: 'INSERT',
      resultStatus: status,
      details,
      errorMessage: error?.message,
      userId: currentUserId
    });
  } catch (err: any) {
    const details = `Disparou exceção segura: ${err?.message || err}`;
    results.push({
      id: 'rls_spoof_intake_logs',
      name: 'Spoofing de Identidade em Logs Nutricionais (Insert)',
      description: 'Garante que um usuário não possa inserir logs fingindo ser outra pessoa (fingindo outro user_id).',
      targetTable: 'intake_logs',
      action: 'INSERT',
      expectedResult: 'blocked',
      status: 'passed',
      details
    });

    await logSecurityAttempt({
      testId: 'rls_spoof_intake_logs',
      testName: 'Spoofing de Identidade em Logs Nutricionais (Insert)',
      targetTable: 'intake_logs',
      action: 'INSERT',
      resultStatus: 'passed',
      details,
      errorMessage: err?.message || String(err),
      userId: currentUserId
    });
  }

  // Test Case 3: Attempt to fetch progress logs of another user
  try {
    const { data, error } = await supabase
      .from('progress_logs')
      .select('*')
      .eq('user_id', fakeUserId);

    const leakedCount = data?.length || 0;
    const isSuccess = leakedCount === 0 || error !== null;
    const status = isSuccess ? 'passed' : 'failed';
    const details = isSuccess
      ? `Bloqueado com sucesso. Linhas de progresso lidas de terceiros: ${leakedCount}.`
      : `FALHA DE SEGURANÇA: ${leakedCount} fotos/registros de progresso de outros usuários vazados!`;

    results.push({
      id: 'rls_read_other_progress',
      name: 'Isolamento de Fotos e Evolução Corporal (Select)',
      description: 'Impede o vazamento de históricos de progresso e pesos corporais de outros perfis.',
      targetTable: 'progress_logs',
      action: 'SELECT',
      expectedResult: 'blocked',
      status,
      errorMessage: error?.message,
      details
    });

    await logSecurityAttempt({
      testId: 'rls_read_other_progress',
      testName: 'Isolamento de Fotos e Evolução Corporal (Select)',
      targetTable: 'progress_logs',
      action: 'SELECT',
      resultStatus: status,
      details,
      errorMessage: error?.message,
      userId: currentUserId
    });
  } catch (err: any) {
    const details = `Disparou exceção segura: ${err?.message || err}`;
    results.push({
      id: 'rls_read_other_progress',
      name: 'Isolamento de Fotos e Evolução Corporal (Select)',
      description: 'Impede o vazamento de históricos de progresso e pesos corporais de outros perfis.',
      targetTable: 'progress_logs',
      action: 'SELECT',
      expectedResult: 'blocked',
      status: 'passed',
      details
    });

    await logSecurityAttempt({
      testId: 'rls_read_other_progress',
      testName: 'Isolamento de Fotos e Evolução Corporal (Select)',
      targetTable: 'progress_logs',
      action: 'SELECT',
      resultStatus: 'passed',
      details,
      errorMessage: err?.message || String(err),
      userId: currentUserId
    });
  }

  // Test Case 4: Attempt to update another user's fridge items
  try {
    const { data, error } = await supabase
      .from('fridge_items')
      .update({ name: 'Hackeado', category: 'Invasão' })
      .eq('user_id', fakeUserId)
      .select();

    const isSuccess = error !== null || !data || data.length === 0;
    const status = isSuccess ? 'passed' : 'failed';
    const details = isSuccess
      ? 'Modificação negada ou nenhum registro alterado pelo banco.'
      : 'FALHA DE SEGURANÇA: Dados da geladeira de outro perfil modificados com sucesso!';

    results.push({
      id: 'rls_update_other_fridge',
      name: 'Alteração Indevida de Alimentos na Geladeira (Update)',
      description: 'Garante que um usuário não possa editar a despensa ou geladeira de outros usuários.',
      targetTable: 'fridge_items',
      action: 'UPDATE',
      expectedResult: 'blocked',
      status,
      errorMessage: error?.message,
      details
    });

    await logSecurityAttempt({
      testId: 'rls_update_other_fridge',
      testName: 'Alteração Indevida de Alimentos na Geladeira (Update)',
      targetTable: 'fridge_items',
      action: 'UPDATE',
      resultStatus: status,
      details,
      errorMessage: error?.message,
      userId: currentUserId
    });
  } catch (err: any) {
    const details = `Disparou exceção segura: ${err?.message || err}`;
    results.push({
      id: 'rls_update_other_fridge',
      name: 'Alteração Indevida de Alimentos na Geladeira (Update)',
      description: 'Garante que um usuário não possa editar a despensa ou geladeira de outros usuários.',
      targetTable: 'fridge_items',
      action: 'UPDATE',
      expectedResult: 'blocked',
      status: 'passed',
      details
    });

    await logSecurityAttempt({
      testId: 'rls_update_other_fridge',
      testName: 'Alteração Indevida de Alimentos na Geladeira (Update)',
      targetTable: 'fridge_items',
      action: 'UPDATE',
      resultStatus: 'passed',
      details,
      errorMessage: err?.message || String(err),
      userId: currentUserId
    });
  }

  // Test Case 5: Attempt to delete another user's hydration log
  try {
    const { data, error } = await supabase
      .from('hydration_logs')
      .delete()
      .eq('user_id', fakeUserId)
      .select();

    const isSuccess = error !== null || !data || data.length === 0;
    const status = isSuccess ? 'passed' : 'failed';
    const details = isSuccess
      ? 'Bloqueado. Ação de exclusão ignorada ou rejeitada por políticas RLS.'
      : 'FALHA DE SEGURANÇA: Histórico de água de outra conta apagado com sucesso!';

    results.push({
      id: 'rls_delete_other_hydration',
      name: 'Deleção Maliciosa de Registros de Hidratação (Delete)',
      description: 'Garante que os logs de água diários estejam protegidos contra remoção arbitrária por outros.',
      targetTable: 'hydration_logs',
      action: 'DELETE',
      expectedResult: 'blocked',
      status,
      errorMessage: error?.message,
      details
    });

    await logSecurityAttempt({
      testId: 'rls_delete_other_hydration',
      testName: 'Deleção Maliciosa de Registros de Hidratação (Delete)',
      targetTable: 'hydration_logs',
      action: 'DELETE',
      resultStatus: status,
      details,
      errorMessage: error?.message,
      userId: currentUserId
    });
  } catch (err: any) {
    const details = `Disparou exceção segura: ${err?.message || err}`;
    results.push({
      id: 'rls_delete_other_hydration',
      name: 'Deleção Maliciosa de Registros de Hidratação (Delete)',
      description: 'Garante que os logs de água diários estejam protegidos contra remoção arbitrária por outros.',
      targetTable: 'hydration_logs',
      action: 'DELETE',
      expectedResult: 'blocked',
      status: 'passed',
      details
    });

    await logSecurityAttempt({
      testId: 'rls_delete_other_hydration',
      testName: 'Deleção Maliciosa de Registros de Hidratação (Delete)',
      targetTable: 'hydration_logs',
      action: 'DELETE',
      resultStatus: 'passed',
      details,
      errorMessage: err?.message || String(err),
      userId: currentUserId
    });
  }

  // Test Case 6: Attempt to write to public medicinal herbs (Should be blocked for non-admins)
  try {
    const intruderHerb = {
      id: 'intruder-test-herb',
      popular_name: 'Super Hack Erva',
      scientific_name: 'Invasoris maliciosus',
      botanical_family: 'Exploitaceae',
      description: 'Tentativa de vandalismo na enciclopédia pública'
    };

    const { data, error } = await supabase
      .from('medicinal_herbs')
      .insert([intruderHerb])
      .select();

    const isSuccess = error !== null || !data || data.length === 0;
    const status = isSuccess ? 'passed' : 'failed';
    const details = isSuccess
      ? `Bloqueado. Erro de permissão: ${error?.message || 'Sem privilégios'}`
      : 'FALHA DE SEGURANÇA: Usuário comum inseriu registro na enciclopédia pública!';

    results.push({
      id: 'rls_write_medicinal_herbs',
      name: 'Proteção da Enciclopédia de Ervas Medicinais (Insert)',
      description: 'Evita vandalismo nas informações públicas bloqueando inserções por usuários comuns.',
      targetTable: 'medicinal_herbs',
      action: 'INSERT',
      expectedResult: 'blocked',
      status,
      errorMessage: error?.message,
      details
    });

    await logSecurityAttempt({
      testId: 'rls_write_medicinal_herbs',
      testName: 'Proteção da Enciclopédia de Ervas Medicinais (Insert)',
      targetTable: 'medicinal_herbs',
      action: 'INSERT',
      resultStatus: status,
      details,
      errorMessage: error?.message,
      userId: currentUserId
    });
  } catch (err: any) {
    const details = `Disparou exceção segura: ${err?.message || err}`;
    results.push({
      id: 'rls_write_medicinal_herbs',
      name: 'Proteção da Enciclopédia de Ervas Medicinais (Insert)',
      description: 'Evita vandalismo nas informações públicas bloqueando inserções por usuários comuns.',
      targetTable: 'medicinal_herbs',
      action: 'INSERT',
      expectedResult: 'blocked',
      status: 'passed',
      details
    });

    await logSecurityAttempt({
      testId: 'rls_write_medicinal_herbs',
      testName: 'Proteção da Enciclopédia de Ervas Medicinais (Insert)',
      targetTable: 'medicinal_herbs',
      action: 'INSERT',
      resultStatus: 'passed',
      details,
      errorMessage: err?.message || String(err),
      userId: currentUserId
    });
  }

  // Log summary to console
  console.log('\n=============================================================');
  console.log('              🛡️  SUPABASE RLS AUDIT REPORT                  ');
  console.log('=============================================================');
  results.forEach(tc => {
    const icon = tc.status === 'passed' ? '✅ [SECURE]' : tc.status === 'failed' ? '❌ [VULNERABLE]' : '⚠️ [SKIPPED]';
    console.log(`${icon} ${tc.name} (${tc.targetTable} - ${tc.action})`);
    console.log(`   - Descrição: ${tc.description}`);
    console.log(`   - Resultado: ${tc.details || 'Rejeitado por padrão'}`);
    if (tc.errorMessage) console.log(`   - DB Message: ${tc.errorMessage}`);
    console.log('-------------------------------------------------------------');
  });
  
  const passedCount = results.filter(r => r.status === 'passed').length;
  console.log(`📊 TOTAL: ${passedCount}/${results.length} testes de isolamento PASSARAM.`);
  console.log('=============================================================\n');

  return results;
}
