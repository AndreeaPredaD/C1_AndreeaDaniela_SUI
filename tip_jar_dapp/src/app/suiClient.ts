import { Transaction } from '@mysten/sui.js';

export const getTipJarStats = async (client: any, tipJarId: string) => {
  const tipJarObject = await client.getObject({
    id: tipJarId,
    options: { showContent: true },
  });
  if (tipJarObject.data?.content && 'fields' in tipJarObject.data.content) {
    const fields = tipJarObject.data.content.fields as Record<string, unknown>;
    return {
      totalTips: String(fields.total_tips_received || '0'),
      tipCount: String(fields.tip_count || '0'),
      owner: String(fields.owner || ''),
    };
  }
  return { totalTips: '0', tipCount: '0', owner: '' };
};

export const resetTipJarStats = (tx: Transaction, tipJarId: string) => {
  tx.moveCall({
    target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::tip_jar_contract::reset_stats`,
    arguments: [tx.object(tipJarId)],
  });
};

export const changeTipJarOwner = (tx: Transaction, tipJarId: string, newOwner: string) => {
  tx.moveCall({
    target: `${process.env.NEXT_PUBLIC_PACKAGE_ID}::tip_jar_contract::change_owner`,
    arguments: [tx.object(tipJarId), tx.pure(newOwner as any, 'address' as any)],
  });
};
