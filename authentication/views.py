from django.shortcuts import render, redirect
from django.contrib.auth import login, logout
from django.contrib.auth.views import LoginView
from django.contrib import messages
from django.urls import reverse_lazy
from django.views.generic import CreateView
from django.contrib.auth.decorators import login_required
from .forms import LoginForm, SignUpForm


# Handles sign-in with the custom login form.
class CustomLoginView(LoginView):
    form_class = LoginForm
    template_name = 'authentication/login.html'
    redirect_authenticated_user = True

    # Shows a welcome message after a successful login.
    def form_valid(self, form):
        messages.success(self.request, f'Welcome back, {form.get_user().username}!')
        return super().form_valid(form)

    # Shows a simple error if the login details are wrong.
    def form_invalid(self, form):
        messages.error(self.request, 'Invalid username or password.')
        return super().form_invalid(form)


# Creates a new user account from the signup form.
class SignUpView(CreateView):
    form_class = SignUpForm
    template_name = 'authentication/signup.html'
    success_url = reverse_lazy('authentication:login')

    # Signs the user in straight after registration and sends them into the app.
    def form_valid(self, form):
        response = super().form_valid(form)
        user = form.save()
        login(self.request, user)
        messages.success(self.request, f'Welcome, {user.username}! Your account has been created.')
        return redirect('advanced_js_mapping:index')

    # Keeps the user on the form and shows a clear error message.
    def form_invalid(self, form):
        messages.error(self.request, 'Please correct the errors below.')
        return super().form_invalid(form)

# Logs the user out and sends them back to the login page.
def custom_logout_view(request):
    username = request.user.username if request.user.is_authenticated else 'User'
    logout(request)
    messages.success(request, f'Goodbye, {username}! You have been logged out.')
    return redirect('authentication:login')

# Shows the profile page and saves a new email when the form is posted.
@login_required
def profile_view(request):
    if request.method == 'POST':
        request.user.email = (request.POST.get('email') or '').strip()
        request.user.save(update_fields=['email'])
        messages.success(request, 'Your email has been updated.')

    return render(request, 'authentication/profile.html', {'user': request.user})

# Shows the auth landing page or the user dashboard, depending on sign-in state.
def home_view(request):
    if request.user.is_authenticated:
        return render(request, 'authentication/dashboard.html')
    return render(request, 'authentication/home.html')
