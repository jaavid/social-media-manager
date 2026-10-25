"""Enroll existing public handles without network calls or credential changes."""
import re
from urllib.parse import urlsplit
from django.db import migrations


def enroll_existing(apps, schema_editor):
    Account = apps.get_model('social_stats', 'SocialAccount')
    Source = apps.get_model('social_stats', 'CalendarSource')
    Competitor = apps.get_model('social_stats', 'Competitor')
    db = schema_editor.connection.alias

    def handle(value):
        if not isinstance(value, str):
            return ''
        value = value.strip()
        if value.startswith('https://'):
            parsed = urlsplit(value)
            if parsed.netloc not in {'instagram.com', 'www.instagram.com'}:
                return ''
            value = parsed.path.strip('/')
        value = value.lstrip('@').lower()
        if value in {'p', 'reel', 'reels', 'stories', 'explore', 'accounts', 'direct'}:
            return ''
        return value if re.fullmatch(r'[a-z0-9_](?:[a-z0-9_.]{0,28}[a-z0-9_])?', value) and '..' not in value else ''

    def link(workspace_id, username, account=None, competitor=None):
        username = handle(username)
        if not username:
            return
        source, _ = Source.objects.using(db).get_or_create(client_id=workspace_id, platform='instagram', username=username)
        if not account:
            account = Account.objects.using(db).filter(client_id=workspace_id, platform='instagram', username__iexact=username).first()
        if not account:
            account, _ = Account.objects.using(db).get_or_create(
                client_id=workspace_id, platform='instagram', external_id=f'public:{username}',
                defaults={'username': username, 'display_name': username})
        source.social_account_id = account.pk
        if competitor:
            source.competitor_id = competitor.pk
        source.save(using=db, update_fields=['social_account', 'competitor'])

    for account in Account.objects.using(db).filter(platform='instagram', is_active=True).iterator():
        link(account.client_id, account.username, account=account)
    for source in Source.objects.using(db).filter(social_account__isnull=True).iterator():
        link(source.client_id, source.username)
    for competitor in Competitor.objects.using(db).all().iterator():
        handles = competitor.public_handles if isinstance(competitor.public_handles, dict) else {}
        links = competitor.social_links if isinstance(competitor.social_links, dict) else {}
        link(competitor.client_id, handles.get('instagram') or links.get('instagram'), competitor=competitor)


class Migration(migrations.Migration):
    dependencies = [('social_stats', '0093_account_watchlist')]
    operations = [migrations.RunPython(enroll_existing, migrations.RunPython.noop)]
