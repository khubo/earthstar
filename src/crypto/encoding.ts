import multibase = require('multibase');
import {
    AuthorAddress,
    AuthorKeypair,
    AuthorShortname,
    Base32String,
    EncodedKey,
    ValidationError,
    WorkspaceAddress,
    WorkspaceName,
    isErr,
} from '../util/types';
import {
    KeypairBuffers,
} from './cryptoTypes';
import {
    ValidatorEs4,
} from '../validator/es4';

//================================================================================
// TODO: this really should happen in the validator?

let assembleWorkspaceAddress = (name: WorkspaceName, encodedPubkey: EncodedKey): WorkspaceAddress =>
    // This doesn't check if it's valid; to do that, parse it and see if parsing has an error.
    `+${name}.${encodedPubkey}`;

let assembleAuthorAddress = (shortname: AuthorShortname, encodedPubkey: EncodedKey): AuthorAddress =>
    // This doesn't check if it's valid; to do that, parse it and see if parsing has an error.
    `@${shortname}.${encodedPubkey}`;

//================================================================================

/**
 * For base32 encoding we use rfc4648, no padding, lowercase, prefixed with "b".
 * 
 * Base32 character set: `abcdefghijklmnopqrstuvwxyz234567`
 * 
 * The Multibase format adds a "b" prefix to specify this particular encoding.
 * We leave the "b" prefix there because we don't want the encoded string
 * to start with a number (so we can use it as a URL location).
 * 
 * When decoding, we require it to start with a "b" --
 * no other multibase formats are allowed.
 * 
 * The decoding must be strict (it doesn't allow a 1 in place of an i, etc).
 */
export let encodeBufferToBase32 = (buf: Buffer): Base32String =>
    multibase.encode('base32', buf).toString();

/**
 * Decode base32 data to a Buffer.  Throw a ValidationError if the string is bad.
 */
export let decodeBase32ToBuffer = (str: Base32String): Buffer => {
    if (!str.startsWith('b')) { throw new ValidationError("can't decode base32 buffer - it should start with a 'b'. " + str); }
    // enforce only lower case characters
    // TODO: this is probably slow on large strings, probably faster to scan character by character?  or use regex?  need to benchmark it
    if (str !== str.toLowerCase()) {
        throw new ValidationError("can't decode base32 string - it contains uppercase characters");
    }
    // this can also throw an Error('invalid base32 character')
    return multibase.decode(str);
};

export let encodePubkey = encodeBufferToBase32;
export let encodeSecret = encodeBufferToBase32;
export let encodeSig = encodeBufferToBase32;
export let encodeHash = encodeBufferToBase32;

export let decodePubkey = decodeBase32ToBuffer;
export let decodeSecret = decodeBase32ToBuffer;
export let decodeSig = decodeBase32ToBuffer;

/** Combine a shortname with a raw KeypairBuffers to make an AuthorKeypair */
export let encodeAuthorKeypair = (shortname: AuthorShortname, pair: KeypairBuffers): AuthorKeypair => ({
    address: assembleAuthorAddress(shortname, encodePubkey(pair.pubkey)),
    secret: encodeSecret(pair.secret),
});

/** Convert an AuthorKeypair back into a raw KeypairBuffers for use in crypto operations. */
export let decodeAuthorKeypair = (pair: AuthorKeypair): KeypairBuffers | ValidationError => {
    try {
        let authorParsed = ValidatorEs4.parseAuthorAddress(pair.address);
        if (isErr(authorParsed)) { return authorParsed; }
        let buffers = {
            pubkey: decodePubkey(authorParsed.pubkey),
            secret: decodeSecret(pair.secret),
        };
        if (buffers.pubkey.length !== 32) {
            return new ValidationError(`pubkey buffer should be 32 bytes long, not ${buffers.pubkey.length} after base32 decoding.  ${pair.address}`);
        }
        if (buffers.secret.length !== 32) {
            return new ValidationError(`secret buffer should be 32 bytes long, not ${buffers.secret.length} after base32 decoding.  ${pair.secret}`);
        }
        return buffers;
    } catch (err) {
        return new ValidationError('crash while decoding author keypair: ' + err.message);
    }
};
