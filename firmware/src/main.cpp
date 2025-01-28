#include <Servo.h>
#include <SPI.h>
#include "Ucglib.h"

#define SERVO_PIN 3
#define ECHO_PIN 5
#define TRIG_PIN 6
#define RESET_PIN 8
#define AO_PIN 9
#define CS_PIN 10
#define BUTTON_PIN 7
#define BAUD 115200

// Function prototypes
void ClearScreen();
void DrawRadarCurves();
void DrawRadarRanges();
void DrawDegreeGraduations();
void DrawDistanceMarkers();
int GetDistance();
void DisplayStartMessage();
void DisplayRadarScreen();
void PerformScan();
void MoveRadar(int direction);
void SetDefaultPosition();

int ScreenHeight = 128;
int ScreenWidth = 160;
int CenterX = 80;
int BasePosition = 118;
int ScanLength = 105;

Servo BaseServo;
Ucglib_ST7735_18x128x160_HWSPI ucg(AO_PIN, CS_PIN, RESET_PIN);

bool scanning = false;
int currentAngle = 90; // Start at center position
int moveDirection = 0; // 0: stop, -1: left, 1: right
const int DEFAULT_ANGLE = 90;

void setup()
{
  ucg.begin(UCG_FONT_MODE_SOLID);
  ucg.setRotate90();
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  BaseServo.attach(SERVO_PIN);
  SetDefaultPosition();

  Serial.begin(BAUD);
  Serial.println("Arduino Radar initialized");

  DisplayStartMessage();
}

void loop()
{
  if (Serial.available())
  {
    char command = Serial.read();
    Serial.print("Received command: ");
    Serial.println(command);

    switch (command)
    {
    case 'S':
      Serial.println("Starting scan...");
      scanning = true;
      SetDefaultPosition();
      DisplayRadarScreen();
      break;
    case 'T':
      Serial.println("Stopping scan...");
      scanning = false;
      moveDirection = 0;
      SetDefaultPosition();
      DisplayStartMessage();
      break;
    case 'L':
      moveDirection = -1;
      break;
    case 'R':
      moveDirection = 1;
      break;
    case 'M':
      moveDirection = 0;
      break;
    default:
      Serial.println("Unknown command");
      break;
    }
  }

  if (scanning)
  {
    PerformScan();
  }
}

void PerformScan()
{
  int distance = GetDistance();
  
  // Convert currentAngle to React app angle
  int reactAngle;
  if (currentAngle <= 90) {
    reactAngle = 90 - currentAngle;
  } else {
    reactAngle = 450 - currentAngle;
  }
  
  Serial.print("Angle: ");
  Serial.print(reactAngle);
  Serial.print(" Distance: ");
  Serial.println(distance);

  int x = CenterX + ScanLength * cos(radians(currentAngle));
  int y = BasePosition - ScanLength * sin(radians(currentAngle));

  // Draw radar sweep line
  ucg.setColor(0, 255, 0);
  ucg.drawLine(CenterX, BasePosition, x, y);
  delay(20);
  ucg.setColor(0, 0, 0);
  ucg.drawLine(CenterX, BasePosition, x, y);

  // Draw detected object
  if (distance < 100)
  {
    ucg.setColor(255, 0, 0);
    int pointX = CenterX + 1.15 * distance * cos(radians(currentAngle));
    int pointY = BasePosition - 1.15 * distance * sin(radians(currentAngle));
    ucg.drawDisc(pointX, pointY, 2, UCG_DRAW_ALL);
  }

  MoveRadar(moveDirection);
}

void MoveRadar(int direction)
{
  currentAngle += direction;
  currentAngle = constrain(currentAngle, 0, 180);
  BaseServo.write(currentAngle);
  delay(15); // Small delay for smooth movement
}

void SetDefaultPosition()
{
  currentAngle = DEFAULT_ANGLE;
  BaseServo.write(currentAngle);
  delay(500); // Wait for servo to reach position
}

void ClearScreen()
{
  ucg.clearScreen();
}

void DrawRadarCurves()
{
  ucg.setColor(0, 64, 0);  // Darker green for the background circles
  for (int i = 1; i <= 4; i++)
  {
    int radius = ScanLength * i / 4;
    ucg.drawCircle(CenterX, BasePosition, radius, UCG_DRAW_UPPER_RIGHT | UCG_DRAW_UPPER_LEFT);
    // Draw vertical lines to complete the half-circle effect
    ucg.drawLine(CenterX - radius, BasePosition, CenterX - radius, BasePosition - 1);
    ucg.drawLine(CenterX + radius, BasePosition, CenterX + radius, BasePosition - 1);
  }
  
  // Draw the main circle with a brighter green
  ucg.setColor(0, 255, 0);
  ucg.drawCircle(CenterX, BasePosition, ScanLength, UCG_DRAW_UPPER_RIGHT | UCG_DRAW_UPPER_LEFT);
  ucg.drawLine(CenterX - ScanLength, BasePosition, CenterX - ScanLength, BasePosition - 1);
  ucg.drawLine(CenterX + ScanLength, BasePosition, CenterX + ScanLength, BasePosition - 1);
}

void DrawRadarRanges()
{
  ucg.drawLine(0, BasePosition, ScreenWidth, BasePosition);
  ucg.drawLine(CenterX, BasePosition - ScanLength, CenterX, BasePosition);
}

void DrawDegreeGraduations()
{
  ucg.setFont(ucg_font_ncenR08_hr);
  ucg.setColor(0, 255, 0);
  
  for (int angle = 0; angle <= 180; angle += 30)
  {
    float radAngle = radians(angle);
    int x1 = CenterX + (ScanLength - 5) * cos(radAngle);
    int y1 = BasePosition - (ScanLength - 5) * sin(radAngle);
    int x2 = CenterX + (ScanLength + 5) * cos(radAngle);
    int y2 = BasePosition - (ScanLength + 5) * sin(radAngle);
    
    ucg.drawLine(x1, y1, x2, y2);
    
    char degreeStr[5];
    sprintf(degreeStr, "%d°", angle);
    int textX = CenterX + (ScanLength + 15) * cos(radAngle);
    int textY = BasePosition - (ScanLength + 15) * sin(radAngle);
    ucg.setPrintPos(textX - ucg.getStrWidth(degreeStr) / 2, textY);
    ucg.print(degreeStr);
  }
}

void DrawDistanceMarkers()
{
  ucg.setFont(ucg_font_ncenR08_hr);
  ucg.setColor(0, 128, 0);  // Medium green for distance markers
  
  for (int dist = 25; dist <= 100; dist += 25)
  {
    int radius = ScanLength * dist / 100;
    char distStr[10];
    sprintf(distStr, "%d", dist);
    int textWidth = ucg.getStrWidth(distStr);
    ucg.setPrintPos(CenterX - textWidth / 2, BasePosition - radius - 5);
    ucg.print(distStr);
  }
}

int GetDistance()
{
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  long duration = pulseIn(ECHO_PIN, HIGH);
  int distance = duration * 0.034 / 2;
  return distance;
}

void DisplayStartMessage()
{
  ClearScreen();
  
  // Display "Arduino Uno" in green
  ucg.setFont(ucg_font_ncenR08_hr);
  ucg.setColor(0, 255, 0);
  ucg.setPrintPos(ScreenWidth / 2 - ucg.getStrWidth("Arduino Uno") / 2, 40);
  ucg.print("Arduino Uno");
  
  // Display "Ultrasonic Sensor" in green with larger font
  ucg.setFont(ucg_font_ncenR12_hr);
  ucg.setColor(0, 255, 0);
  ucg.setPrintPos(ScreenWidth / 2 - ucg.getStrWidth("Ultrasonic Sensor") / 2, 65);
  ucg.print("Ultrasonic Sensor");
  
  // Display "Press Start Button" in white with the same font as "Arduino Uno"
  ucg.setFont(ucg_font_ncenR08_hr);
  ucg.setColor(255, 255, 255);
  ucg.setPrintPos(ScreenWidth / 2 - ucg.getStrWidth("Press Start Button") / 2, 90);
  ucg.print("Press Start Button");
}

void DisplayRadarScreen()
{
  ClearScreen();
  DrawRadarCurves();
  DrawRadarRanges();
  DrawDegreeGraduations();
  DrawDistanceMarkers();
}

