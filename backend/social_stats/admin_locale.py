from django.utils import translation


class BackendAdminLocaleMiddleware:
    """Keep the internal admin Persian without changing the API's locale."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path_info == '/backend' or request.path_info.startswith('/backend/'):
            with translation.override('fa'):
                request.LANGUAGE_CODE = 'fa'
                return self.get_response(request)
        return self.get_response(request)
