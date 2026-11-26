from setuptools import find_packages, setup

package_name = 'ur3e_camera'

setup(
    name=package_name,
    version='0.1.0',
    packages=find_packages(exclude=['test']),
    data_files=[
        ('share/ament_index/resource_index/packages', ['resource/' + package_name]),
        ('share/' + package_name, ['package.xml']),
    ],
    install_requires=['setuptools'],
    zip_safe=True,
    maintainer='To be assigned',
    maintainer_email='todo@example.com',
    description='RGB camera acquisition utilities',
    license='TODO',
    tests_require=['pytest'],
    entry_points={
        'console_scripts': [
            'stream_check = ur3e_camera.nodes.stream_check:main',
            'dataset_recorder = ur3e_camera.nodes.dataset_recorder:main',
        ],
    },
)
