/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { profileAPI } from '@/services/domains/identity';
import { QK } from '@/services/queryClient';
import { apiError } from '@/services/http/errors';
import { useLanguage } from '@/i18n';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import DataState from '@/components/ui/DataState';

/** Validate the profile endpoint's different GET and PATCH wire contracts. */
export function parseProfile(data, userId) {
  if (
    !data ||
    typeof data.first_name !== 'string' ||
    typeof data.last_name !== 'string' ||
    !(
      data.avatar === null ||
      (typeof data.avatar === 'string' && /^(https?:\/\/|\/[^/])/.test(data.avatar))
    ) ||
    (userId !== undefined && (data.id !== userId || typeof data.email !== 'string'))
  )
    throw new Error('Invalid profile response');
  return data;
}

/** Account-owned resource; a context change remounts its private editable draft. */
export default function ProfileSettings({ user, children }) {
  const identity = [user?.id, user?.role, user?.account_type];
  const workspace = user?.workspace_id ?? user?.client_id ?? null;
  return (
    <ProfileRead
      key={JSON.stringify([...identity, workspace])}
      identity={identity}
      workspace={workspace}
      user={user}
    >
      {children}
    </ProfileRead>
  );
}
function ProfileRead({ identity, workspace, user, children }) {
  const { t } = useLanguage();
  const query = useQuery({
    queryKey: QK.profile(identity, workspace),
    enabled: !!user?.id,
    queryFn: async ({ signal }) => parseProfile((await profileAPI.get(signal)).data, user.id),
  });
  const error = apiError(query.error);
  const denied = [401, 403, 404].includes(error.status);
  const data = denied ? undefined : query.data;
  const retry = (
    <Button onClick={() => query.refetch()} disabled={query.isFetching}>
      {t('profile.retry')}
    </Button>
  );
  return (
    <section className="min-w-0 space-y-4 p-4 sm:p-8" aria-label={t('profile.title')}>
      <h2 className="text-lg font-semibold">{t('profile.title')}</h2>
      <p className="text-sm text-muted-foreground">{t('profile.description')}</p>
      {!data && (
        <DataState
          compact
          state={
            !user?.id || denied
              ? 'forbidden'
              : query.isPaused
                ? 'offline'
                : query.isError
                  ? 'error'
                  : 'loading'
          }
          title={t(
            !user?.id || denied
              ? 'profile.denied'
              : query.isError || query.isPaused
                ? 'profile.readFailed'
                : 'profile.loading',
          )}
          action={user?.id && retry}
        />
      )}
      {data && (
        <>
          {(query.isError || query.isPaused) && (
            <DataState
              compact
              state={query.isPaused ? 'offline' : 'stale'}
              title={t('profile.refreshFailed')}
              action={retry}
            />
          )}
          {query.isFetching && (
            <DataState compact state="refreshing" title={t('profile.refreshing')} />
          )}
          <ProfileForm initial={data} queryKey={QK.profile(identity, workspace)} />
          <Button variant="secondary" disabled={query.isFetching} onClick={() => query.refetch()}>
            {t('profile.refresh')}
          </Button>
          {children}
        </>
      )}
    </section>
  );
}
function ProfileForm({ initial, queryKey }) {
  const queryClient = useQueryClient();
  const { t } = useLanguage();
  const [first, setFirst] = useState(initial.first_name);
  const [last, setLast] = useState(initial.last_name);
  const [savedAvatar, setSavedAvatar] = useState(initial.avatar);
  const [file, setFile] = useState(null);
  const [remove, setRemove] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState(null);
  const [success, setSuccess] = useState(false);
  const [fileError, setFileError] = useState(false);
  const [preview, setPreview] = useState(null);
  const alive = useRef(true),
    pending = useRef(false),
    cancelRef = useRef(null),
    removeRef = useRef(null),
    fileRef = useRef(null),
    errorRef = useRef(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // The object URL belongs to this File and is revoked on replacement/unmount.
    setPreview(url); // eslint-disable-line react-hooks/set-state-in-effect
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (failure) errorRef.current?.focus();
  }, [failure]);
  function changed() {
    setSuccess(false);
  }
  async function save(event) {
    event.preventDefault();
    if (pending.current || !first.trim() || fileError) return;
    pending.current = true;
    setBusy(true);
    setFailure(null);
    setSuccess(false);
    const body = new FormData();
    body.append('first_name', first.trim());
    body.append('last_name', last.trim());
    if (file && !remove) body.append('avatar', file);
    if (remove) body.append('remove_avatar', 'true');
    try {
      await queryClient.cancelQueries({ queryKey, exact: true });
      const saved = parseProfile((await profileAPI.update(body)).data);
      if (!saved.first_name.trim()) throw new Error('Invalid saved profile');
      if (alive.current) {
        queryClient.setQueryData(queryKey, { ...initial, ...saved });
        setFirst(saved.first_name);
        setLast(saved.last_name);
        setSavedAvatar(saved.avatar);
        setFile(null);
        setRemove(false);
        setSuccess(true);
        if (fileRef.current) fileRef.current.value = '';
      }
    } catch (error) {
      if (alive.current) setFailure(apiError(error));
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const avatar = remove ? null : file ? preview : savedAvatar;
  return (
    <>
      <form onSubmit={save} className="min-w-0 space-y-4">
        <fieldset disabled={busy} className="min-w-0 space-y-4">
          <legend className="ds-field-label">{t('profile.photo')}</legend>
          {avatar && (
            <Image
              unoptimized
              width={80}
              height={80}
              src={avatar}
              alt={t('profile.photo')}
              className="h-20 w-20 rounded-full object-cover"
            />
          )}
          <Input
            ref={fileRef}
            label={t('profile.upload')}
            hint={t('profile.fileHint')}
            error={fileError ? t('profile.fileInvalid') : undefined}
            type="file"
            accept="image/*"
            onChange={(event) => {
              const next = event.target.files?.[0];
              if (!next) return;
              changed();
              if (!next.type.startsWith('image/') || next.size > 5 * 1024 * 1024) {
                setFileError(true);
                event.target.value = '';
                return;
              }
              setFileError(false);
              setFile(next);
              setRemove(false);
            }}
          />
          {(savedAvatar || file) && (
            <Button
              ref={removeRef}
              type="button"
              variant={remove ? 'secondary' : 'danger'}
              onClick={() => {
                if (remove) {
                  setRemove(false);
                  changed();
                } else setConfirm(true);
              }}
            >
              {t(remove ? 'profile.undo' : 'profile.remove')}
            </Button>
          )}
          {remove && <DataState compact state="partial" title={t('profile.removalPending')} />}
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <Input
              label={t('profile.first')}
              required
              maxLength={150}
              autoComplete="given-name"
              value={first}
              error={!first.trim() ? t('profile.required') : undefined}
              onChange={(event) => {
                setFirst(event.target.value);
                changed();
              }}
            />
            <Input
              label={t('profile.last')}
              maxLength={150}
              autoComplete="family-name"
              value={last}
              onChange={(event) => {
                setLast(event.target.value);
                changed();
              }}
            />
          </div>
          <Input
            label={t('profile.email')}
            hint={t('profile.emailHint')}
            type="email"
            dir="ltr"
            data-ltr="true"
            readOnly
            value={initial.email}
          />
        </fieldset>
        {failure && (
          <DataState
            compact
            focusRef={errorRef}
            state={failure.status === 403 ? 'forbidden' : 'error'}
            title={t('profile.saveFailed')}
            referenceId={failure.referenceId}
          />
        )}
        {success && (
          <p role="status" className="text-sm text-foreground">
            {t('profile.saved')}
          </p>
        )}
        <Button type="submit" loading={busy} disabled={busy || !first.trim() || fileError}>
          {t('profile.save')}
        </Button>
      </form>
      <Modal
        open={confirm}
        role="alertdialog"
        initialFocusRef={cancelRef}
        returnFocusRef={removeRef}
        title={t('profile.remove')}
        description={t('profile.removeConfirm')}
        onClose={() => setConfirm(false)}
        footer={
          <>
            <Button ref={cancelRef} onClick={() => setConfirm(false)}>
              {t('profile.cancel')}
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                setRemove(true);
                setConfirm(false);
                changed();
              }}
            >
              {t('profile.confirmRemove')}
            </Button>
          </>
        }
      />
    </>
  );
}
