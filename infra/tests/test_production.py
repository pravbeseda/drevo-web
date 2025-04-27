import testinfra
import yaml

# Читаем конфигурацию из production.yml
with open('infra/inventory/production.yml', 'r') as f:
    config = yaml.safe_load(f)
    
# Получаем адрес production сервера
HOST = config['all']['hosts']['production-server']['ansible_host']
USER = config['all']['hosts']['production-server']['ansible_user']

# Используем прямое подключение к production серверу
testinfra_hosts = [f'ssh://{USER}@{HOST}']

def test_nginx_installed(host):
    # Проверяем, что nginx установлен
    nginx = host.package('nginx')
    assert nginx.is_installed

def test_nginx_running_and_enabled(host):
    # Проверяем, что сервис nginx запущен и включён
    service = host.service('nginx')
    assert service.is_running
    assert service.is_enabled

def test_port_80_listening(host):
    # Проверяем, что порт 80 слушает
    socket = host.socket('tcp://0.0.0.0:80')
    assert socket.is_listening

# Add more tests as needed... 