export async function onRequestGet({ params, env }) {
    const object = await env.PHOTOS.get(params.key);
    if (!object) return new Response('Photo introuvable.', { status: 404 });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    return new Response(object.body, { headers });
}
