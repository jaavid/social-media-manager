from django.contrib.auth import logout
from rest_framework.authentication import SessionAuthentication


class BrowserSessionAuthentication(SessionAuthentication):
    def authenticate(self, request):
        jti = request.session.get('browser_session_jti')
        if jti:
            from .security.sessions import UserSession
            record = UserSession.objects.filter(refresh_jti=jti, user_id=request._request.user.pk).first()
            if not record or not record.is_active:
                logout(request._request)
                return None
        return super().authenticate(request)

    def authenticate_header(self, request):
        return 'Session'
