"use client";

import {Box, Button, Center, Flex, Heading, Spacer} from "@chakra-ui/react";
import Image from "next/image";
import {useParams, useRouter} from "next/navigation";
import HatList from "../../components/HatList";
import ProjectInfo from "../../components/ProjectInfo";
import RoleList from "../../components/RoleList";
import {ConnectButton} from "@rainbow-me/rainbowkit";
import {useGetHats, useGetMyRoles} from "@/hooks/useHatRead";

export default function ProjectTop() {
  const {hatId} = useParams();

  const {topHat, roleHats} = useGetHats(hatId.toString());
  const {myRoles} = useGetMyRoles();

  const router = useRouter();

  const isWalletConnected = false; // 実際のウォレット接続ロジックと置き換えてください

  const roles: any = [
    {name: "Cleaning", icon: "🧹", href: "/roles/cleaning"},
    {name: "Committee", icon: "🧑‍💼", href: "/roles/committee"},
    {name: "Contents", icon: "📝", href: "/roles/contents"},
    {name: "Food", icon: "🍴", href: "/roles/food"},
  ];

  const hats = [
    {name: "Hat 1", href: "/hats/1"},
    {name: "Hat 2", href: "/hats/2"},
  ];

  return (
    <>
      {/* Header */}
      <Box as="header" width="100%" position="relative" height="200px">
        <Image
          src="/header.png"
          alt="Header Image"
          layout="fill"
          objectFit="cover"
          priority={true}
        />
        <Flex
          position="absolute"
          top="0"
          left="0"
          right="0"
          p="4"
          alignItems="center"
          bg="rgba(0, 0, 0, 0.5)"
        >
          <Heading size="md" color="white">
            Project Top
          </Heading>
          <Spacer />
          <ConnectButton />
          <Button
            colorScheme="teal"
            variant="outline"
            onClick={() => router.push("/")}
          >
            Back to Main Page
          </Button>
        </Flex>
      </Box>

      {/* Main Content */}
      <Center py={10} px={6} bg="gray.900">
        <Box
          maxW="lg"
          w="full"
          bg="gray.700"
          color="white"
          p={8}
          borderRadius="lg"
          boxShadow="lg"
        >
          <ProjectInfo
            members={15}
            splitters={2}
            projectName={topHat?.data.name}
            projectDescription={topHat?.data.description}
          />
          <RoleList roles={roles} hatId={hatId.toString()} />
          {isWalletConnected && <HatList hats={hats} />}
        </Box>
      </Center>
    </>
  );
}
