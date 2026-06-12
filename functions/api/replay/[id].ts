interface KVNamespace {
  get(key: string): Promise<string | null>;
}

interface Env {
  REPLAY_KV: KVNamespace;
}

export const onRequestGet: PagesFunction<Env> = async ({ params, env }) => {
  const id = params.id as string;

  if (!id || !/^[A-Za-z0-9]{6,16}$/.test(id)) {
    return new Response(JSON.stringify({ error: 'Invalid ID' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const data = await env.REPLAY_KV.get(id);

  if (!data) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(data, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
};
